"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const base_1 = require("@companion-module/base");
const actions_js_1 = require("./actions.js");
const config_js_1 = require("./config.js");
const feedback_js_1 = require("./feedback.js");
const presets_js_1 = require("./presets.js");
const client_js_1 = require("./client.js");
const variables_js_1 = require("./variables.js");
const upgrades_js_1 = require("./upgrades.js");
class TwolooxPandorasInstance extends base_1.InstanceBase {
    constructor() {
        super(...arguments);
        this.state = {
            transport: 'Unknown',
            remaining: { h: 0, m: 0, s: 0, f: 0 },
        };
        this.sequences = [];
        this.sequenceStates = new Map();
        this.sequenceTimes = new Map();
    }
    getSequenceChoices() {
        if (this.sequences.length === 0) {
            return [{ id: 1, label: 'Sequence 1 (not connected)' }];
        }
        return this.sequences.map((seq) => ({
            id: seq.id,
            label: `${seq.id}: ${seq.name}`,
        }));
    }
    updateActionDefinitions() {
        this.setActionDefinitions((0, actions_js_1.GetActionsList)(() => this.client, () => this.getSequenceChoices(), (seqId) => this.sequenceStates.get(seqId) || 'Unknown'));
    }
    async init(config) {
        this.updateActionDefinitions();
        this.setFeedbackDefinitions((0, feedback_js_1.GetFeedbacksList)(() => this.state, () => this.getSequenceChoices(), (seqId) => this.sequenceStates.get(seqId) || 'Unknown'));
        this.setPresetDefinitions((0, presets_js_1.GetPresetsList)(this.sequences, () => this.sequenceStates));
        this.setVariableDefinitions((0, variables_js_1.GetVariableDefinitions)());
        await this.configUpdated(config);
    }
    async destroy() {
        if (this.sequenceRefreshTimer) {
            clearInterval(this.sequenceRefreshTimer);
            this.sequenceRefreshTimer = undefined;
        }
        this.client?.disconnect();
        this.client = undefined;
    }
    getConfigFields() {
        return (0, config_js_1.GetConfigFields)();
    }
    async configUpdated(config) {
        if (this.sequenceRefreshTimer) {
            clearInterval(this.sequenceRefreshTimer);
            this.sequenceRefreshTimer = undefined;
        }
        this.client?.disconnect();
        this.client = undefined;
        this.sequences = [];
        const host = config.host?.trim();
        const domain = Number(config.domain ?? 0);
        if (!host) {
            this.updateStatus(base_1.InstanceStatus.BadConfig, 'Host is required');
            return;
        }
        this.updateStatus(base_1.InstanceStatus.Connecting);
        const client = new client_js_1.PBClient(host, domain, {
            onTransport: (state) => {
                this.state.transport = state;
            },
            onSequenceTransport: (seqId, state) => {
                this.sequenceStates.set(seqId, state);
                this.updateSequenceStatusVariables();
                this.checkFeedbacks();
            },
            onSequenceTime: (seqId, h, m, s, f) => {
                this.sequenceTimes.set(seqId, { h, m, s, f });
                this.updateSequenceTimeVariables();
            },
            onSequencesUpdated: (sequences) => {
                this.log('info', `Received ${sequences.length} sequences from Pandoras Box`);
                this.sequences = sequences;
                // Update actions with new sequence choices
                this.updateActionDefinitions();
                // Update variable definitions and values for sequences
                this.updateSequenceVariables();
                // Start polling sequence statuses
                this.client?.setPollSequences(sequences.map((s) => s.id));
                // Update presets with new sequences
                this.updatePresetDefinitions();
            },
            onDebug: (message) => {
                this.log('debug', `[PBClient] ${message}`);
            },
            onError: (err) => {
                this.log('error', err.message);
                this.updateStatus(base_1.InstanceStatus.UnknownError, err.message);
            },
        });
        this.client = client;
        try {
            await client.connect();
            this.updateStatus(base_1.InstanceStatus.Ok);
            this.log('info', 'Connected to Pandoras Box, requesting sequences...');
            // Fetch sequences immediately and then every 10 seconds
            const refreshSequences = () => {
                this.log('debug', 'Refreshing sequences...');
                void client.refreshSequences();
            };
            // Initial refresh after 500ms
            setTimeout(refreshSequences, 500);
            // Then refresh every 10 seconds
            this.sequenceRefreshTimer = setInterval(refreshSequences, 10000);
        }
        catch (e) {
            const msg = e?.message ?? 'Connect failed';
            this.log('error', msg);
            this.updateStatus(base_1.InstanceStatus.UnknownError, msg);
        }
    }
    updateSequenceVariables() {
        // Update variable definitions to include sequence variables
        const baseVars = (0, variables_js_1.GetVariableDefinitions)();
        const seqVars = (0, variables_js_1.GetSequenceVariableDefinitions)(this.sequences);
        const statusVars = (0, variables_js_1.GetSequenceStatusVariableDefinitions)(this.sequences);
        const timeVars = (0, variables_js_1.GetSequenceTimeVariableDefinitions)(this.sequences);
        this.setVariableDefinitions([...baseVars, ...seqVars, ...statusVars, ...timeVars]);
        // Set the sequence variable values
        const seqValues = (0, variables_js_1.GetSequenceVariableValues)(this.sequences);
        this.setVariableValues(seqValues);
        this.log('debug', `Created ${this.sequences.length} sequence variables (name, status, time)`);
    }
    updateSequenceStatusVariables() {
        const statusValues = (0, variables_js_1.GetSequenceStatusVariableValues)(this.sequences, this.sequenceStates);
        this.setVariableValues(statusValues);
    }
    updateSequenceTimeVariables() {
        const timeValues = (0, variables_js_1.GetSequenceTimeVariableValues)(this.sequences, this.sequenceTimes);
        this.setVariableValues(timeValues);
    }
    updatePresetDefinitions() {
        this.setPresetDefinitions((0, presets_js_1.GetPresetsList)(this.sequences, () => this.sequenceStates));
    }
}
(0, base_1.runEntrypoint)(TwolooxPandorasInstance, upgrades_js_1.UpgradeScripts);
//# sourceMappingURL=index.js.map