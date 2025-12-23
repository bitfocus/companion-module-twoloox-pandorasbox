import type { CompanionVariableDefinition, CompanionVariableValues } from '@companion-module/base'
import type { SequenceInfo, TransportState, CueInfo } from './client.js'

export function GetVariableDefinitions(): CompanionVariableDefinition[] {
  // Base definitions are empty now - all sequence-specific
  return []
}

// Generate variable definitions for discovered sequences
export function GetSequenceVariableDefinitions(sequences: SequenceInfo[]): CompanionVariableDefinition[] {
  return sequences.map((seq) => ({
    variableId: `sequence_${seq.id}`,
    name: `Sequence ${seq.id} Name`,
  }))
}

// Generate variable values for discovered sequences
export function GetSequenceVariableValues(sequences: SequenceInfo[]): CompanionVariableValues {
  const values: CompanionVariableValues = {}
  for (const seq of sequences) {
    values[`sequence_${seq.id}`] = seq.name
  }
  return values
}

// Generate variable definitions for sequence statuses
export function GetSequenceStatusVariableDefinitions(sequences: SequenceInfo[]): CompanionVariableDefinition[] {
  return sequences.map((seq) => ({
    variableId: `sequence_${seq.id}_status`,
    name: `Sequence ${seq.id} Status`,
  }))
}

// Generate variable values for sequence statuses
export function GetSequenceStatusVariableValues(
  sequences: SequenceInfo[],
  states: Map<number, TransportState>,
): CompanionVariableValues {
  const values: CompanionVariableValues = {}
  for (const seq of sequences) {
    values[`sequence_${seq.id}_status`] = states.get(seq.id) || 'Unknown'
  }
  return values
}

// Generate variable definitions for sequence times
export function GetSequenceTimeVariableDefinitions(sequences: SequenceInfo[]): CompanionVariableDefinition[] {
  const defs: CompanionVariableDefinition[] = []
  for (const seq of sequences) {
    defs.push(
      { variableId: `sequence_${seq.id}_time`, name: `Sequence ${seq.id} Time (HH:MM:SS:ff)` },
      { variableId: `sequence_${seq.id}_hh`, name: `Sequence ${seq.id} Hours` },
      { variableId: `sequence_${seq.id}_mm`, name: `Sequence ${seq.id} Minutes` },
      { variableId: `sequence_${seq.id}_ss`, name: `Sequence ${seq.id} Seconds` },
      { variableId: `sequence_${seq.id}_ff`, name: `Sequence ${seq.id} Frames` },
    )
  }
  return defs
}

// Generate variable definitions for countdown to next cue
export function GetSequenceCountdownVariableDefinitions(sequences: SequenceInfo[]): CompanionVariableDefinition[] {
  const defs: CompanionVariableDefinition[] = []
  for (const seq of sequences) {
    defs.push(
      { variableId: `sequence_${seq.id}_countdown`, name: `Sequence ${seq.id} Countdown to Next Cue (HH:MM:SS:ff)` },
      { variableId: `sequence_${seq.id}_countdown_hh`, name: `Sequence ${seq.id} Countdown Hours` },
      { variableId: `sequence_${seq.id}_countdown_mm`, name: `Sequence ${seq.id} Countdown Minutes` },
      { variableId: `sequence_${seq.id}_countdown_ss`, name: `Sequence ${seq.id} Countdown Seconds` },
      { variableId: `sequence_${seq.id}_countdown_ff`, name: `Sequence ${seq.id} Countdown Frames` },
    )
  }
  return defs
}

export interface SequenceTime {
  h: number
  m: number
  s: number
  f: number
}

// Generate variable values for sequence times
export function GetSequenceTimeVariableValues(
  sequences: SequenceInfo[],
  times: Map<number, SequenceTime>,
): CompanionVariableValues {
  const values: CompanionVariableValues = {}
  for (const seq of sequences) {
    const time = times.get(seq.id)
    if (time) {
      const hh = time.h.toString().padStart(2, '0')
      const mm = time.m.toString().padStart(2, '0')
      const ss = time.s.toString().padStart(2, '0')
      const ff = time.f.toString().padStart(2, '0')
      values[`sequence_${seq.id}_time`] = `${hh}:${mm}:${ss}:${ff}`
      values[`sequence_${seq.id}_hh`] = hh
      values[`sequence_${seq.id}_mm`] = mm
      values[`sequence_${seq.id}_ss`] = ss
      values[`sequence_${seq.id}_ff`] = ff
    } else {
      values[`sequence_${seq.id}_time`] = '00:00:00:00'
      values[`sequence_${seq.id}_hh`] = '00'
      values[`sequence_${seq.id}_mm`] = '00'
      values[`sequence_${seq.id}_ss`] = '00'
      values[`sequence_${seq.id}_ff`] = '00'
    }
  }
  return values
}

// Generate variable values for countdown to next cue
export function GetSequenceCountdownVariableValues(
  sequences: SequenceInfo[],
  countdowns: Map<number, SequenceTime>,
): CompanionVariableValues {
  const values: CompanionVariableValues = {}
  for (const seq of sequences) {
    const time = countdowns.get(seq.id)
    if (time) {
      const hh = time.h.toString().padStart(2, '0')
      const mm = time.m.toString().padStart(2, '0')
      const ss = time.s.toString().padStart(2, '0')
      const ff = time.f.toString().padStart(2, '0')
      values[`sequence_${seq.id}_countdown`] = `${hh}:${mm}:${ss}:${ff}`
      values[`sequence_${seq.id}_countdown_hh`] = hh
      values[`sequence_${seq.id}_countdown_mm`] = mm
      values[`sequence_${seq.id}_countdown_ss`] = ss
      values[`sequence_${seq.id}_countdown_ff`] = ff
    } else {
      values[`sequence_${seq.id}_countdown`] = '--:--:--:--'
      values[`sequence_${seq.id}_countdown_hh`] = '--'
      values[`sequence_${seq.id}_countdown_mm`] = '--'
      values[`sequence_${seq.id}_countdown_ss`] = '--'
      values[`sequence_${seq.id}_countdown_ff`] = '--'
    }
  }
  return values
}

// Generate variable definitions for next cue info
export function GetSequenceNextCueVariableDefinitions(sequences: SequenceInfo[]): CompanionVariableDefinition[] {
  const defs: CompanionVariableDefinition[] = []
  for (const seq of sequences) {
    defs.push(
      { variableId: `sequence_${seq.id}_nextcue`, name: `Sequence ${seq.id} Next Cue (Name + Mode + ID)` },
      { variableId: `sequence_${seq.id}_nextcue_name`, name: `Sequence ${seq.id} Next Cue Name` },
      { variableId: `sequence_${seq.id}_nextcue_id`, name: `Sequence ${seq.id} Next Cue ID` },
      { variableId: `sequence_${seq.id}_nextcue_mode`, name: `Sequence ${seq.id} Next Cue Mode Letter` },
    )
  }
  return defs
}

// Convert cue mode number to letter
function cueModeToLetter(mode: number): string {
  switch (mode) {
    case 0: return 'P'  // Pause
    case 1: return 'C'  // Continue/Play
    case 2: return 'S'  // Stop
    case 3: return 'J'  // Jump
    case 4: return 'W'  // Wait
    default: return '?'
  }
}

// Generate variable values for next cue info
export function GetSequenceNextCueVariableValues(
  sequences: SequenceInfo[],
  cueInfos: Map<number, CueInfo>,
): CompanionVariableValues {
  const values: CompanionVariableValues = {}
  for (const seq of sequences) {
    const cue = cueInfos.get(seq.id)
    if (cue && cue.nextCueId !== 0) {
      const modeLetter = cueModeToLetter(cue.nextCueMode)
      values[`sequence_${seq.id}_nextcue`] = `${cue.nextCueName} (${modeLetter} ${cue.nextCueId})`
      values[`sequence_${seq.id}_nextcue_name`] = cue.nextCueName
      values[`sequence_${seq.id}_nextcue_id`] = cue.nextCueId.toString()
      values[`sequence_${seq.id}_nextcue_mode`] = modeLetter
    } else {
      values[`sequence_${seq.id}_nextcue`] = '-- (No Cue)'
      values[`sequence_${seq.id}_nextcue_name`] = '--'
      values[`sequence_${seq.id}_nextcue_id`] = '--'
      values[`sequence_${seq.id}_nextcue_mode`] = '--'
    }
  }
  return values
}
