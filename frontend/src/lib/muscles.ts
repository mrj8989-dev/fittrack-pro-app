// Mapa de músculos para la ficha de ejercicio: qué zonas del cuerpo trabaja cada uno.

export type MuscleId =
  | 'chest' | 'shoulders' | 'biceps' | 'forearms' | 'abs' | 'obliques' | 'quads' | 'adductors' | 'tibialis'
  | 'traps' | 'lats' | 'lower-back' | 'triceps' | 'glutes' | 'hamstrings' | 'calves'

export const MUSCLE_LABEL: Record<MuscleId, string> = {
  chest: 'Pectoral',
  shoulders: 'Hombros',
  biceps: 'Bíceps',
  forearms: 'Antebrazos',
  abs: 'Abdomen',
  obliques: 'Oblicuos',
  quads: 'Cuádriceps',
  adductors: 'Aductores',
  tibialis: 'Tibial',
  traps: 'Trapecio',
  lats: 'Dorsales',
  'lower-back': 'Lumbares',
  triceps: 'Tríceps',
  glutes: 'Glúteos',
  hamstrings: 'Isquiotibiales',
  calves: 'Gemelos',
}

/** Grupo muscular del catálogo al que pertenece cada zona (para filtrar tocando el mapa). */
export const MUSCLE_TO_GROUP: Record<MuscleId, string> = {
  chest: 'Pecho',
  shoulders: 'Hombros',
  biceps: 'Bíceps',
  forearms: 'Antebrazos',
  abs: 'Core',
  obliques: 'Core',
  quads: 'Cuádriceps',
  adductors: 'Aductores',
  tibialis: 'Gemelos',
  traps: 'Trapecio',
  lats: 'Espalda',
  'lower-back': 'Espalda',
  triceps: 'Tríceps',
  glutes: 'Glúteos',
  hamstrings: 'Isquiotibiales',
  calves: 'Gemelos',
}

export interface MuscleTargets {
  primary: MuscleId[]
  secondary: MuscleId[]
}

const t = (primary: MuscleId[], secondary: MuscleId[] = []): MuscleTargets => ({ primary, secondary })

const BY_GROUP: Record<string, MuscleTargets> = {
  Pecho: t(['chest'], ['shoulders', 'triceps']),
  Espalda: t(['lats', 'traps'], ['biceps', 'shoulders', 'forearms']),
  Hombros: t(['shoulders'], ['triceps', 'traps']),
  Trapecio: t(['traps'], ['forearms', 'shoulders']),
  Bíceps: t(['biceps'], ['forearms']),
  Tríceps: t(['triceps'], ['chest', 'shoulders']),
  Antebrazos: t(['forearms'], ['biceps']),
  Cuádriceps: t(['quads'], ['glutes', 'adductors']),
  Isquiotibiales: t(['hamstrings'], ['glutes', 'lower-back']),
  Glúteos: t(['glutes'], ['hamstrings', 'quads']),
  Aductores: t(['adductors'], ['glutes']),
  Gemelos: t(['calves'], ['tibialis']),
  Core: t(['abs', 'obliques'], ['lower-back']),
  'Full body': t(['quads', 'glutes', 'shoulders', 'lats'], ['abs', 'hamstrings', 'traps', 'triceps']),
  Cardio: t(['quads', 'calves'], ['glutes', 'hamstrings']),
}

// Ajustes por nombre cuando el grupo se queda corto (p. ej. un peso muerto no es solo "espalda").
// Se evalúan en orden; gana la primera coincidencia.
const BY_NAME: [RegExp, MuscleTargets][] = [
  [/sentadilla sumo|peso muerto sumo/, t(['glutes', 'adductors'], ['quads', 'hamstrings'])],
  [/peso muerto (rumano|con piernas|a una pierna)|n[oó]rdico/, t(['hamstrings', 'glutes'], ['lower-back'])],
  [/peso muerto|rack pull/, t(['hamstrings', 'glutes', 'lower-back'], ['lats', 'traps', 'forearms', 'quads'])],
  [/hiperextensi|buenos d[ií]as|superman/, t(['lower-back'], ['glutes', 'hamstrings'])],
  [/dominadas|jal[oó]n|pullover/, t(['lats'], ['biceps', 'shoulders', 'forearms'])],
  [/face pull|p[aá]jaros|deltoides posterior|cruce inverso|elevaciones en y/, t(['shoulders'], ['traps'])],
  [/remo ergómetro|remo ergometro/, t(['lats', 'quads'], ['biceps', 'hamstrings', 'glutes'])],
  [/hip thrust|puente|frog/, t(['glutes'], ['hamstrings'])],
  [/zancada|b[uú]lgara|step-up|subidas al caj/, t(['quads', 'glutes'], ['adductors', 'hamstrings'])],
  [/giros rusos|le[ñn]ador|plancha lateral|crunch bicicleta|maleta/, t(['obliques'], ['abs'])],
  [/granjero/, t(['forearms', 'traps'], ['abs', 'quads'])],
  [/kettlebell swing|pull through/, t(['glutes', 'hamstrings'], ['lower-back', 'abs'])],
  [/tibial/, t(['tibialis'])],
  [/fondos/, t(['chest', 'triceps'], ['shoulders'])],
  [/press cerrado|agarre cerrado|jm press/, t(['triceps'], ['chest', 'shoulders'])],
  [/flexiones pica|pike/, t(['shoulders'], ['triceps'])],
  [/remo al ment[oó]n/, t(['shoulders', 'traps'], ['biceps'])],
  [/curl (invertido|inverso)/, t(['forearms', 'biceps'])],
]

export function musclesFor(exercise: { name: string; muscleGroup: string }): MuscleTargets {
  const name = exercise.name.toLowerCase()
  for (const [re, targets] of BY_NAME) if (re.test(name)) return targets
  return BY_GROUP[exercise.muscleGroup] ?? t([])
}

/** Color de acento por grupo muscular, para distinguirlos de un vistazo en la lista. */
export const GROUP_HUE: Record<string, number> = {
  Pecho: 0, Espalda: 210, Hombros: 30, Trapecio: 250, Bíceps: 280, Tríceps: 320, Antebrazos: 190,
  Cuádriceps: 150, Isquiotibiales: 170, Glúteos: 340, Aductores: 120, Gemelos: 90, Core: 50,
  'Full body': 15, Cardio: 355,
}
