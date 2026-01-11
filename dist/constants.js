"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_POLL_INTERVAL_MS = exports.CommandId = exports.PR_PORT = void 0;
exports.PR_PORT = 6211;
var CommandId;
(function (CommandId) {
    CommandId[CommandId["SetSeqTransportMode"] = 3] = "SetSeqTransportMode";
    CommandId[CommandId["MoveSeqToCue"] = 4] = "MoveSeqToCue";
    CommandId[CommandId["MoveSeqToLastNextCue"] = 7] = "MoveSeqToLastNextCue";
    CommandId[CommandId["ResetAll"] = 9] = "ResetAll";
    CommandId[CommandId["ClearAllActive"] = 13] = "ClearAllActive";
    CommandId[CommandId["ToggleFullscreen"] = 17] = "ToggleFullscreen";
    CommandId[CommandId["StoreActive"] = 25] = "StoreActive";
    CommandId[CommandId["SetSeqSmpteMode"] = 41] = "SetSeqSmpteMode";
    CommandId[CommandId["StoreActiveToBeginning"] = 414] = "StoreActiveToBeginning";
    CommandId[CommandId["ClearSelection"] = 48] = "ClearSelection";
    CommandId[CommandId["IgnoreNextCue"] = 55] = "IgnoreNextCue";
    CommandId[CommandId["SaveProject"] = 62] = "SaveProject";
    CommandId[CommandId["SetSiteIp"] = 71] = "SetSiteIp";
    CommandId[CommandId["ApplyView"] = 103] = "ApplyView";
    CommandId[CommandId["SetSeqSelection"] = 299] = "SetSeqSelection";
    CommandId[CommandId["GetSeqTransportMode"] = 72] = "GetSeqTransportMode";
    CommandId[CommandId["GetSeqTime"] = 73] = "GetSeqTime";
    CommandId[CommandId["GetRemainingTimeUntilNextCue"] = 78] = "GetRemainingTimeUntilNextCue";
    // Sequence discovery (from official enum)
    CommandId[CommandId["GetSequenceIds"] = 425] = "GetSequenceIds";
    CommandId[CommandId["GetSequenceName"] = 426] = "GetSequenceName";
})(CommandId || (exports.CommandId = CommandId = {}));
exports.DEFAULT_POLL_INTERVAL_MS = 200;
//# sourceMappingURL=constants.js.map