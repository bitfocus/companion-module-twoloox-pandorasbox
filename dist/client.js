"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PBClient = void 0;
const net_1 = __importDefault(require("net"));
const constants_js_1 = require("./constants.js");
// Lightweight connection for a single sequence's timecode polling
class SequenceConnection {
    constructor(host, domain, seqId, onTime, onDebug) {
        this.socket = null;
        this.pollTimer = null;
        this.connected = false;
        this.currentState = 'Unknown';
        this.host = host;
        this.domain = domain;
        this.seqId = seqId;
        this.onTime = onTime;
        this.onDebug = onDebug;
    }
    async connect() {
        if (this.socket)
            return;
        await new Promise((resolve, reject) => {
            const sock = new net_1.default.Socket();
            this.socket = sock;
            sock.once('error', (err) => {
                this.onDebug?.(`SeqConn[${this.seqId}] error: ${err.message}`);
                this.connected = false;
                this.socket = null;
                reject(err);
            });
            sock.once('close', () => {
                this.connected = false;
                this.socket = null;
                this.stopPolling();
            });
            sock.on('data', (data) => this.handleData(data));
            sock.connect({ host: this.host, port: constants_js_1.PR_PORT }, () => {
                this.connected = true;
                resolve();
                this.startPolling();
            });
        });
    }
    disconnect() {
        this.stopPolling();
        if (this.socket) {
            this.socket.destroy();
            this.socket = null;
        }
        this.connected = false;
    }
    updateState(state) {
        this.currentState = state;
    }
    startPolling() {
        this.stopPolling();
        this.scheduleNextPoll();
    }
    stopPolling() {
        if (this.pollTimer) {
            clearTimeout(this.pollTimer);
            this.pollTimer = null;
        }
    }
    scheduleNextPoll() {
        const interval = this.currentState === 'Play'
            ? SequenceConnection.POLL_FAST
            : SequenceConnection.POLL_SLOW;
        this.pollTimer = setTimeout(async () => {
            if (!this.connected || !this.socket)
                return;
            try {
                await this.sendGetTime();
            }
            catch (e) {
                this.onDebug?.(`SeqConn[${this.seqId}] send error: ${e}`);
            }
            this.scheduleNextPoll();
        }, interval);
    }
    async sendGetTime() {
        const seqIdBuf = Buffer.alloc(4);
        seqIdBuf.writeInt32BE(this.seqId);
        await this.send(constants_js_1.CommandId.GetSeqTime, [seqIdBuf]);
    }
    handleData(data) {
        try {
            if (data.length < 19)
                return;
            if (data.toString('ascii', 0, 4) !== 'PBAU')
                return;
            const domain = data.readInt32BE(5);
            if (domain !== this.domain)
                return;
            const cmdId = data.readInt16BE(17);
            if (cmdId === constants_js_1.CommandId.GetSeqTime && data.length >= 35) {
                const h = data.readInt32BE(19);
                const m = data.readInt32BE(23);
                const s = data.readInt32BE(27);
                const f = data.readInt32BE(31);
                this.onTime(h, m, s, f);
            }
        }
        catch (e) {
            this.onDebug?.(`SeqConn[${this.seqId}] parse error: ${e}`);
        }
    }
    async send(commandId, parts) {
        if (!this.socket || !this.connected)
            return;
        const body = Buffer.concat([this.writeShort(commandId), ...parts]);
        const header = this.buildHeader(body.length);
        const checksum = this.checksum(header);
        const message = Buffer.concat([Buffer.from('PBAU', 'ascii'), header, Buffer.from([checksum]), body]);
        await new Promise((resolve, reject) => {
            this.socket?.write(message, (err) => {
                if (err)
                    reject(err);
                else
                    resolve();
            });
        });
    }
    buildHeader(bodyLen) {
        const preHeader = Buffer.from([1]);
        const domain = this.writeInt(this.domain);
        const length = Buffer.from([Math.floor(bodyLen / 256), bodyLen % 256]);
        const postHeader = Buffer.from([0, 0, 0, 0, 0]);
        return Buffer.concat([preHeader, domain, length, postHeader]);
    }
    checksum(buf) {
        let sum = 0;
        for (const b of buf.values())
            sum = (sum + b) % 256;
        return sum;
    }
    writeShort(n) {
        const b = Buffer.alloc(2);
        b.writeUInt16BE(n);
        return b;
    }
    writeInt(n) {
        const b = Buffer.alloc(4);
        b.writeInt32BE(n);
        return b;
    }
}
SequenceConnection.POLL_FAST = 33; // 30x/sec when playing
SequenceConnection.POLL_SLOW = 200; // 5x/sec when stopped/paused
class PBClient {
    constructor(host, domain, handlers) {
        this.statusPollTimer = null;
        this.socket = null;
        this.connecting = false;
        this.pendingSequenceIds = [];
        this.pendingSequenceNames = new Map();
        this.sequenceNameQueue = [];
        this.currentSequenceNameId = null;
        this.pollSequenceIds = [];
        this.statusRequestQueue = [];
        this.currentStatusRequestId = null;
        this.statusRequestPending = false;
        this.sequenceStates = new Map();
        // Per-sequence connections for timecode polling
        this.sequenceConnections = new Map();
        this.host = host;
        this.domain = domain;
        this.pollHandlers = handlers;
    }
    async connect() {
        if (this.socket)
            return;
        this.connecting = true;
        await new Promise((resolve, reject) => {
            const sock = new net_1.default.Socket();
            this.socket = sock;
            sock.once('error', (err) => {
                this.connecting = false;
                this.socket = null;
                this.pollHandlers.onError?.(err);
                reject(err);
            });
            sock.once('close', () => {
                this.connecting = false;
                this.socket = null;
                this.stopPolling();
            });
            sock.on('data', (data) => this.handleData(data));
            sock.connect({ host: this.host, port: constants_js_1.PR_PORT }, () => {
                this.connecting = false;
                resolve();
                this.startPolling();
            });
        });
    }
    disconnect() {
        this.stopPolling();
        this.disconnectAllSequenceConnections();
        if (this.socket) {
            this.socket.destroy();
            this.socket = null;
        }
    }
    disconnectAllSequenceConnections() {
        for (const conn of this.sequenceConnections.values()) {
            conn.disconnect();
        }
        this.sequenceConnections.clear();
    }
    updateHandlers(handlers) {
        this.pollHandlers = handlers;
    }
    setPollSequences(sequenceIds) {
        this.pollSequenceIds = sequenceIds;
        // Create/update sequence connections for timecode polling
        this.updateSequenceConnections(sequenceIds);
    }
    async updateSequenceConnections(sequenceIds) {
        // Remove connections for sequences no longer in the list
        for (const [seqId, conn] of this.sequenceConnections.entries()) {
            if (!sequenceIds.includes(seqId)) {
                conn.disconnect();
                this.sequenceConnections.delete(seqId);
            }
        }
        // Create connections for new sequences
        for (const seqId of sequenceIds) {
            if (!this.sequenceConnections.has(seqId)) {
                const conn = new SequenceConnection(this.host, this.domain, seqId, (h, m, s, f) => {
                    this.pollHandlers.onSequenceTime?.(seqId, h, m, s, f);
                }, undefined // No debug logging for sequence connections
                );
                this.sequenceConnections.set(seqId, conn);
                try {
                    await conn.connect();
                }
                catch (e) {
                    this.pollHandlers.onDebug?.(`Failed to connect sequence ${seqId}: ${e}`);
                }
            }
        }
    }
    async setTransport(mode, sequenceId) {
        await this.send(constants_js_1.CommandId.SetSeqTransportMode, [this.writeInt(sequenceId), this.writeInt(mode)]);
    }
    async selectSequence(sequenceId) {
        await this.send(constants_js_1.CommandId.SetSeqSelection, [this.writeInt(sequenceId)]);
    }
    async gotoCue(sequenceId, cueId) {
        await this.send(constants_js_1.CommandId.MoveSeqToCue, [this.writeInt(sequenceId), this.writeInt(cueId)]);
    }
    async nextOrLastCue(sequenceId, isNext) {
        await this.send(constants_js_1.CommandId.MoveSeqToLastNextCue, [this.writeInt(sequenceId), Buffer.from([isNext ? 1 : 0])]);
    }
    async ignoreNextCue(sequenceId, doIgnore) {
        await this.send(constants_js_1.CommandId.IgnoreNextCue, [this.writeInt(sequenceId), Buffer.from([doIgnore ? 1 : 0])]);
    }
    async applyView(viewId) {
        await this.send(constants_js_1.CommandId.ApplyView, [this.writeInt(viewId)]);
    }
    async saveProject() {
        await this.send(constants_js_1.CommandId.SaveProject, []);
    }
    async toggleFullscreen(siteId) {
        await this.send(constants_js_1.CommandId.ToggleFullscreen, [this.writeInt(siteId)]);
    }
    async setSiteIp(siteId, ip) {
        const ipBuf = Buffer.from(ip, 'ascii');
        await this.send(constants_js_1.CommandId.SetSiteIp, [this.writeInt(siteId), this.writeShort(ipBuf.length), ipBuf]);
    }
    async clearAllActive() {
        await this.send(constants_js_1.CommandId.ClearAllActive, []);
    }
    async storeActive(sequenceId) {
        await this.send(constants_js_1.CommandId.StoreActive, [this.writeInt(sequenceId)]);
    }
    async storeActiveToBeginning(sequenceId) {
        await this.send(constants_js_1.CommandId.StoreActiveToBeginning, [this.writeInt(sequenceId)]);
    }
    async resetAll() {
        await this.send(constants_js_1.CommandId.ResetAll, []);
    }
    async setSequenceSmpteMode(sequenceId, mode) {
        // mode: 0=None, 1=Send, 2=Receive
        await this.send(constants_js_1.CommandId.SetSeqSmpteMode, [this.writeInt(sequenceId), this.writeInt(mode)]);
    }
    async refreshSequences() {
        this.pendingSequenceIds = [];
        this.pendingSequenceNames.clear();
        this.sequenceNameQueue = [];
        await this.send(constants_js_1.CommandId.GetSequenceIds, []);
    }
    async fetchSequenceName(seqId) {
        this.currentSequenceNameId = seqId;
        await this.send(constants_js_1.CommandId.GetSequenceName, [this.writeInt(seqId)]);
    }
    startPolling() {
        this.stopPolling();
        // Reset pending flags when starting fresh
        this.statusRequestPending = false;
        this.statusRequestQueue = [];
        // Status polling: 5x per second for all sequences
        this.statusPollTimer = setInterval(() => {
            if (this.statusRequestQueue.length === 0 && this.pollSequenceIds.length > 0) {
                this.statusRequestQueue = [...this.pollSequenceIds];
                void this.processStatusRequestQueue();
            }
        }, PBClient.STATUS_POLL_INTERVAL);
        // Timecode polling is now handled by per-sequence connections
    }
    // Called when sequence state changes to update polling speed in sequence connections
    updateSequenceState(seqId, state) {
        this.sequenceStates.set(seqId, state);
        // Notify the sequence connection about state change for adaptive polling
        const conn = this.sequenceConnections.get(seqId);
        if (conn) {
            conn.updateState(state);
        }
    }
    stopPolling() {
        if (this.statusPollTimer) {
            clearInterval(this.statusPollTimer);
            this.statusPollTimer = null;
        }
        // Sequence connections handle their own polling
    }
    async send(commandId, parts) {
        if (!this.socket || this.connecting) {
            return;
        }
        const body = Buffer.concat([this.writeShort(commandId), ...parts]);
        const header = this.buildHeader(body.length);
        const checksum = this.checksum(header);
        const message = Buffer.concat([Buffer.from('PBAU', 'ascii'), header, Buffer.from([checksum]), body]);
        await new Promise((resolve, reject) => {
            this.socket?.write(message, (err) => {
                if (err) {
                    this.pollHandlers.onError?.(err);
                    reject(err);
                }
                else {
                    resolve();
                }
            });
        });
    }
    handleData(data) {
        try {
            if (data.length < 19)
                return;
            if (data.toString('ascii', 0, 4) !== 'PBAU')
                return;
            const domain = data.readInt32BE(5);
            if (domain !== this.domain)
                return;
            const cmdId = data.readInt16BE(17);
            switch (cmdId) {
                case constants_js_1.CommandId.GetSeqTransportMode: {
                    // Response format: Only Int state (no seqId!)
                    // We track which seqId we're requesting via currentStatusRequestId
                    // State is at offset 19, right after the PBAU header
                    this.statusRequestPending = false;
                    if (data.length >= 23) {
                        const stateInt = data.readInt32BE(19);
                        const state = stateInt === 1 ? 'Play' : stateInt === 2 ? 'Stop' : stateInt === 3 ? 'Pause' : 'Unknown';
                        // Check if this is for a specific sequence or main polling
                        if (this.currentStatusRequestId !== null) {
                            // Update internal state for polling speed adjustment
                            this.updateSequenceState(this.currentStatusRequestId, state);
                            this.pollHandlers.onSequenceTransport?.(this.currentStatusRequestId, state);
                            void this.processStatusRequestQueue();
                        }
                        else {
                            this.pollHandlers.onTransport?.(state);
                        }
                    }
                    break;
                }
                // GetSeqTime is handled by per-sequence connections, not main connection
                case constants_js_1.CommandId.GetRemainingTimeUntilNextCue: {
                    const h = data.readInt32BE(19);
                    const m = data.readInt32BE(23);
                    const s = data.readInt32BE(27);
                    const f = data.readInt32BE(31);
                    this.pollHandlers.onNextCueTime?.(h, m, s, f);
                    break;
                }
                case constants_js_1.CommandId.GetSequenceIds: {
                    // Response format: Int count (BE), Int mystery (BE), then count * Int IDs (LE)!
                    const count = data.readInt32BE(19);
                    this.pendingSequenceIds = [];
                    // Start reading IDs at offset 27, as Little-Endian
                    let offset = 27;
                    for (let i = 0; i < count && offset + 4 <= data.length; i++) {
                        const seqId = data.readInt32LE(offset);
                        this.pendingSequenceIds.push(seqId);
                        offset += 4;
                    }
                    // Queue up name requests
                    this.sequenceNameQueue = [...this.pendingSequenceIds];
                    this.pendingSequenceNames.clear();
                    // Start fetching names
                    void this.processSequenceNameQueue();
                    break;
                }
                case constants_js_1.CommandId.GetSequenceName: {
                    // Response format: Short strLen, then strLen bytes (ASCII string)
                    // No seqId in response! We track it from the request
                    if (this.currentSequenceNameId === null) {
                        break;
                    }
                    const strLen = data.readInt16BE(19);
                    let name = '';
                    for (let i = 0; i < strLen && 21 + i < data.length; i++) {
                        name += String.fromCharCode(data.readUInt8(21 + i));
                    }
                    this.pendingSequenceNames.set(this.currentSequenceNameId, name);
                    this.currentSequenceNameId = null;
                    // Check if we got all names
                    if (this.pendingSequenceNames.size === this.pendingSequenceIds.length) {
                        const sequences = this.pendingSequenceIds.map((id) => ({
                            id,
                            name: this.pendingSequenceNames.get(id) || `Sequence ${id}`,
                        }));
                        this.pollHandlers.onSequencesUpdated?.(sequences);
                    }
                    else {
                        // Fetch next name
                        void this.processSequenceNameQueue();
                    }
                    break;
                }
                case 0xFFFF:
                case -1: {
                    // Error response from Pandoras Box - skip invalid sequence
                    if (this.currentStatusRequestId !== null) {
                        // Remove invalid sequence from polling list
                        const invalidId = this.currentStatusRequestId;
                        this.pollSequenceIds = this.pollSequenceIds.filter(id => id !== invalidId);
                        void this.processStatusRequestQueue();
                    }
                    if (this.currentSequenceNameId !== null) {
                        // Remove from pending IDs and skip to next
                        const invalidId = this.currentSequenceNameId;
                        this.pendingSequenceIds = this.pendingSequenceIds.filter(id => id !== invalidId);
                        this.currentSequenceNameId = null;
                        void this.processSequenceNameQueue();
                    }
                    break;
                }
                default:
                    break;
            }
        }
        catch (err) {
            this.pollHandlers.onError?.(err);
        }
    }
    async processSequenceNameQueue() {
        if (this.sequenceNameQueue.length === 0)
            return;
        const nextId = this.sequenceNameQueue.shift();
        if (nextId !== undefined) {
            await this.fetchSequenceName(nextId);
        }
    }
    async processStatusRequestQueue() {
        // Don't start a new request if one is pending
        if (this.statusRequestPending) {
            return;
        }
        if (this.statusRequestQueue.length === 0) {
            this.currentStatusRequestId = null;
            return;
        }
        const nextId = this.statusRequestQueue.shift();
        if (nextId !== undefined) {
            this.currentStatusRequestId = nextId;
            this.statusRequestPending = true;
            await this.send(constants_js_1.CommandId.GetSeqTransportMode, [this.writeInt(nextId)]);
        }
    }
    // Time polling is now handled by per-sequence SequenceConnection instances
    buildHeader(bodyLen) {
        const preHeader = Buffer.from([1]);
        const domain = this.writeInt(this.domain);
        const length = Buffer.from([Math.floor(bodyLen / 256), bodyLen % 256]);
        const postHeader = Buffer.from([0, 0, 0, 0, 0]);
        return Buffer.concat([preHeader, domain, length, postHeader]);
    }
    checksum(buf) {
        let sum = 0;
        for (const b of buf.values())
            sum = (sum + b) % 256;
        return sum;
    }
    writeShort(n) {
        const b = Buffer.alloc(2);
        b.writeUInt16BE(n);
        return b;
    }
    writeInt(n) {
        const b = Buffer.alloc(4);
        b.writeInt32BE(n);
        return b;
    }
}
exports.PBClient = PBClient;
// Polling intervals
PBClient.STATUS_POLL_INTERVAL = 200; // 5x per second
//# sourceMappingURL=client.js.map