"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetVariableDefinitions = GetVariableDefinitions;
exports.GetSequenceVariableDefinitions = GetSequenceVariableDefinitions;
exports.GetSequenceVariableValues = GetSequenceVariableValues;
exports.GetSequenceStatusVariableDefinitions = GetSequenceStatusVariableDefinitions;
exports.GetSequenceStatusVariableValues = GetSequenceStatusVariableValues;
exports.GetSequenceTimeVariableDefinitions = GetSequenceTimeVariableDefinitions;
exports.GetSequenceTimeVariableValues = GetSequenceTimeVariableValues;
function GetVariableDefinitions() {
    // Base definitions are empty now - all sequence-specific
    return [];
}
// Generate variable definitions for discovered sequences
function GetSequenceVariableDefinitions(sequences) {
    return sequences.map((seq) => ({
        variableId: `sequence_${seq.id}`,
        name: `Sequence ${seq.id} Name`,
    }));
}
// Generate variable values for discovered sequences
function GetSequenceVariableValues(sequences) {
    const values = {};
    for (const seq of sequences) {
        values[`sequence_${seq.id}`] = seq.name;
    }
    return values;
}
// Generate variable definitions for sequence statuses
function GetSequenceStatusVariableDefinitions(sequences) {
    return sequences.map((seq) => ({
        variableId: `sequence_${seq.id}_status`,
        name: `Sequence ${seq.id} Status`,
    }));
}
// Generate variable values for sequence statuses
function GetSequenceStatusVariableValues(sequences, states) {
    const values = {};
    for (const seq of sequences) {
        values[`sequence_${seq.id}_status`] = states.get(seq.id) || 'Unknown';
    }
    return values;
}
// Generate variable definitions for sequence times
function GetSequenceTimeVariableDefinitions(sequences) {
    return sequences.map((seq) => ({
        variableId: `sequence_${seq.id}_time`,
        name: `Sequence ${seq.id} Time (HH:MM:SS:ff)`,
    }));
}
// Generate variable values for sequence times
function GetSequenceTimeVariableValues(sequences, times) {
    const values = {};
    for (const seq of sequences) {
        const time = times.get(seq.id);
        if (time) {
            const hh = time.h.toString().padStart(2, '0');
            const mm = time.m.toString().padStart(2, '0');
            const ss = time.s.toString().padStart(2, '0');
            const ff = time.f.toString().padStart(2, '0');
            values[`sequence_${seq.id}_time`] = `${hh}:${mm}:${ss}:${ff}`;
        }
        else {
            values[`sequence_${seq.id}_time`] = '00:00:00:00';
        }
    }
    return values;
}
//# sourceMappingURL=variables.js.map