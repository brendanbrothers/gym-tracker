export const EXERCISE_CATEGORIES = [
    "strength",
    "stretching",
    "plyometrics",
    "strongman",
    "powerlifting",
    "cardio",
    "olympic weightlifting",
  ] as const
  
  export const PRIMARY_MUSCLES = [
    "abdominals",
    "abductors",
    "adductors",
    "biceps",
    "calves",
    "chest",
    "forearms",
    "glutes",
    "hamstrings",
    "lats",
    "lower back",
    "middle back",
    "neck",
    "quadriceps",
    "shoulders",
    "traps",
    "triceps",
  ] as const
  
  export const EQUIPMENT = [
    "barbell",
    "dumbbell",
    "cable",
    "machine",
    "kettlebells",
    "bands",
    "medicine ball",
    "exercise ball",
    "foam roll",
    "e-z curl bar",
    "body only",
    "other",
  ] as const
  
  export type ExerciseCategory = typeof EXERCISE_CATEGORIES[number]
  export type PrimaryMuscle = typeof PRIMARY_MUSCLES[number]
  export type Equipment = typeof EQUIPMENT[number]