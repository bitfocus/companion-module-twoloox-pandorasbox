"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeedbackId = void 0;
exports.GetFeedbacksList = GetFeedbacksList;
var FeedbackId;
(function (FeedbackId) {
    FeedbackId["TransportState"] = "transport_state";
    FeedbackId["RemainingCueThreshold"] = "remaining_threshold";
    FeedbackId["SequenceTransportState"] = "sequence_transport_state";
})(FeedbackId || (exports.FeedbackId = FeedbackId = {}));
function GetFeedbacksList(getState, getSequenceChoices, getSequenceState) {
    return {
        [FeedbackId.TransportState]: {
            type: 'boolean',
            name: 'Transport state matches',
            description: 'True when transport matches selected state',
            options: [
                {
                    type: 'dropdown',
                    id: 'state',
                    label: 'State',
                    default: 'Play',
                    choices: [
                        { id: 'Play', label: 'Play' },
                        { id: 'Pause', label: 'Pause' },
                        { id: 'Stop', label: 'Stop' },
                    ],
                },
            ],
            defaultStyle: {},
            callback: (fb) => {
                const state = getState().transport;
                return state === fb.options.state;
            },
        },
        [FeedbackId.RemainingCueThreshold]: {
            type: 'boolean',
            name: 'Remaining cue under threshold',
            description: 'True when remaining time until next cue is below threshold (seconds)',
            options: [
                {
                    type: 'number',
                    id: 'threshold',
                    label: 'Threshold seconds',
                    default: 10,
                    min: 1,
                    max: 3600,
                    step: 1,
                },
            ],
            defaultStyle: {},
            callback: (fb) => {
                const rem = getState().remaining;
                const totalSec = rem.h * 3600 + rem.m * 60 + rem.s;
                return totalSec <= Number(fb.options.threshold);
            },
        },
        [FeedbackId.SequenceTransportState]: {
            type: 'boolean',
            name: 'Sequence transport state matches',
            description: 'True when a specific sequence transport state matches',
            options: [
                {
                    type: 'dropdown',
                    id: 'sequence',
                    label: 'Sequence',
                    default: 1,
                    choices: getSequenceChoices(),
                    allowCustom: true,
                },
                {
                    type: 'dropdown',
                    id: 'state',
                    label: 'State',
                    default: 'Play',
                    choices: [
                        { id: 'Play', label: 'Play' },
                        { id: 'Pause', label: 'Pause' },
                        { id: 'Stop', label: 'Stop' },
                    ],
                },
            ],
            defaultStyle: {},
            callback: (fb) => {
                const seqId = Number(fb.options.sequence);
                const state = getSequenceState(seqId);
                return state === fb.options.state;
            },
        },
    };
}
//# sourceMappingURL=feedback.js.map