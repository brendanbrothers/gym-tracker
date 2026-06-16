"use server"

import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth"
import { z } from "zod"
import { authOptions, isTrainer } from "@/lib/auth"
import { prisma } from "@/lib/db"
import {
  collectSessionPbs,
  evaluateRoundForPb,
  getPersonalBests,
  type PbHit,
  type PersonalBests,
} from "@/lib/personal-bests"

const optionalInt = z.string().nullable().optional().transform((v) =>
  v && v.trim() !== "" ? parseInt(v, 10) : null
).refine((v) => v === null || !isNaN(v), { message: "Must be a valid number" })

const optionalFloat = z.string().nullable().optional().transform((v) =>
  v && v.trim() !== "" ? parseFloat(v) : null
).refine((v) => v === null || !isNaN(v), { message: "Must be a valid number" })

const addExerciseSchema = z.object({
  exerciseId: z.string().min(1, "Exercise is required"),
  modifier: z.string().nullable().optional(),
  targetReps: optionalInt,
  targetWeight: optionalFloat,
  targetDuration: optionalInt,
  rounds: z.string().optional().transform((v) => (v ? parseInt(v, 10) : 1)).pipe(z.number().min(1).max(20)),
})

const updateExerciseSchema = z.object({
  actualReps: optionalInt,
  actualWeight: optionalFloat,
  actualDuration: optionalInt,
  notes: z.string().nullable().optional(),
  completed: z.boolean(),
})

const updateTargetsSchema = z.object({
  targetReps: optionalInt,
  targetWeight: optionalFloat,
  targetDuration: optionalInt,
  modifier: z.string().nullable().optional(),
})

async function getWorkoutOwner(workoutId: string): Promise<string | null> {
  const workout = await prisma.workoutSession.findUnique({
    where: { id: workoutId },
    select: { clientId: true },
  })
  return workout?.clientId ?? null
}

async function requireTrainer() {
  const session = await getServerSession(authOptions)
  if (!session || !isTrainer(session.user.role)) {
    throw new Error("Unauthorized: Trainer access required")
  }
  return session
}

async function requireTrainerOrOwner(workoutId: string) {
  const session = await getServerSession(authOptions)
  if (!session) {
    throw new Error("Unauthorized")
  }
  const ownerId = await getWorkoutOwner(workoutId)
  const isOwner = ownerId === session.user.id
  const userIsTrainer = isTrainer(session.user.role)
  if (!isOwner && !userIsTrainer) {
    throw new Error("Unauthorized: You can only access your own workouts")
  }
  return session
}

export async function addSet(workoutId: string) {
  await requireTrainer()

  const lastSet = await prisma.workoutSet.findFirst({
    where: { workoutSessionId: workoutId },
    orderBy: { order: "desc" },
  })

  const newOrder = (lastSet?.order ?? 0) + 1

  await prisma.workoutSet.create({
    data: {
      workoutSessionId: workoutId,
      order: newOrder,
    },
  })

  revalidatePath(`/workouts/${workoutId}`)
}

export async function deleteSet(setId: string, workoutId: string) {
  await requireTrainer()

  await prisma.workoutSet.delete({
    where: { id: setId },
  })

  revalidatePath(`/workouts/${workoutId}`)
}

export async function addExerciseToSet(
    setId: string,
    workoutId: string,
    formData: FormData
  ) {
    await requireTrainer()

    const parsed = addExerciseSchema.safeParse({
      exerciseId: formData.get("exerciseId"),
      modifier: formData.get("modifier") || null,
      targetReps: formData.get("targetReps"),
      targetWeight: formData.get("targetWeight"),
      targetDuration: formData.get("targetDuration"),
      rounds: formData.get("rounds"),
    })

    if (!parsed.success) {
      return { error: parsed.error.issues[0].message }
    }

    const { exerciseId, modifier, targetReps, targetWeight, targetDuration, rounds } = parsed.data

    const lastExercise = await prisma.setExercise.findFirst({
      where: { workoutSetId: setId },
      orderBy: { order: "desc" },
    })

    const newOrder = (lastExercise?.order ?? 0) + 1

    // Create an entry for each round
    for (let round = 1; round <= rounds; round++) {
      await prisma.setExercise.create({
        data: {
          workoutSetId: setId,
          exerciseId,
          order: newOrder,
          round,
          modifier: modifier || null,
          targetReps,
          targetWeight,
          targetDuration,
        },
      })
    }

    revalidatePath(`/workouts/${workoutId}`)
  }

export async function addRound(
  setId: string,
  exerciseId: string,
  order: number,
  workoutId: string
) {
  await requireTrainer()

  // Find the last round for this exercise in this set
  const lastRound = await prisma.setExercise.findFirst({
    where: {
      workoutSetId: setId,
      exerciseId,
      order,
    },
    orderBy: { round: "desc" },
  })

  if (!lastRound) {
    return { error: "Exercise not found" }
  }

  const newRound = lastRound.round + 1

  await prisma.setExercise.create({
    data: {
      workoutSetId: setId,
      exerciseId,
      order,
      round: newRound,
      modifier: lastRound.modifier,
      targetReps: lastRound.targetReps,
      targetWeight: lastRound.targetWeight,
      targetDuration: lastRound.targetDuration,
    },
  })

  revalidatePath(`/workouts/${workoutId}`)
}

export async function updateExercise(
  exerciseId: string,
  workoutId: string,
  formData: FormData
) {
  await requireTrainerOrOwner(workoutId)

  const parsed = updateExerciseSchema.safeParse({
    actualReps: formData.get("actualReps"),
    actualWeight: formData.get("actualWeight"),
    actualDuration: formData.get("actualDuration"),
    notes: formData.get("notes") || null,
    completed: formData.get("completed") === "true",
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  await prisma.setExercise.update({
    where: { id: exerciseId },
    data: parsed.data,
  })

  // Logging a result means the session is underway: auto-advance it from
  // SCHEDULED to IN_PROGRESS. Scoped to SCHEDULED so it never disturbs a
  // completed/cancelled session, and it never reverts on un-complete.
  if (parsed.data.completed) {
    await prisma.workoutSession.updateMany({
      where: { id: workoutId, status: "SCHEDULED" },
      data: { status: "IN_PROGRESS" },
    })
  }

  // When a round is completed, check whether it beat the client's prior bests so
  // the UI can celebrate it in the moment.
  let pbs: PbHit[] = []
  if (parsed.data.completed) {
    const saved = await prisma.setExercise.findUnique({
      where: { id: exerciseId },
      select: {
        id: true,
        exerciseId: true,
        actualReps: true,
        actualWeight: true,
        actualDuration: true,
        workoutSet: { select: { workoutSession: { select: { clientId: true } } } },
      },
    })
    if (saved) {
      pbs = await evaluateRoundForPb({
        exerciseId: saved.exerciseId,
        clientId: saved.workoutSet.workoutSession.clientId,
        setExerciseId: saved.id,
        actualReps: saved.actualReps,
        actualWeight: saved.actualWeight,
        actualDuration: saved.actualDuration,
      })
    }
  }

  revalidatePath(`/workouts/${workoutId}`)
  return { pbs }
}

// A client's current PBs for an exercise. Shown to trainers while programming
// targets, and to clients on their own workouts. Either a trainer (any client)
// or the client viewing their own data may read it.
export async function getClientPersonalBests(
  clientId: string,
  exerciseId: string
): Promise<PersonalBests> {
  const session = await getServerSession(authOptions)
  if (!session) {
    throw new Error("Unauthorized")
  }
  if (!isTrainer(session.user.role) && session.user.id !== clientId) {
    throw new Error("Unauthorized: You can only view your own personal bests")
  }
  return getPersonalBests(exerciseId, clientId)
}

export async function deleteExercise(exerciseId: string, workoutId: string) {
  await requireTrainer()

  await prisma.setExercise.delete({
    where: { id: exerciseId },
  })

  revalidatePath(`/workouts/${workoutId}`)
}

export async function startWorkout(workoutId: string) {
  await requireTrainerOrOwner(workoutId)

  await prisma.workoutSession.update({
    where: { id: workoutId },
    data: { status: "IN_PROGRESS" },
  })

  revalidatePath(`/workouts/${workoutId}`)
}

export async function cancelWorkout(workoutId: string) {
  await requireTrainerOrOwner(workoutId)

  await prisma.workoutSession.update({
    where: { id: workoutId },
    data: { status: "CANCELLED" },
  })

  revalidatePath(`/workouts/${workoutId}`)
}

// Restore a cancelled session back to SCHEDULED (it never started).
export async function restoreWorkout(workoutId: string) {
  await requireTrainerOrOwner(workoutId)

  await prisma.workoutSession.update({
    where: { id: workoutId },
    data: { status: "SCHEDULED" },
  })

  revalidatePath(`/workouts/${workoutId}`)
}

export async function completeWorkout(workoutId: string) {
  await requireTrainerOrOwner(workoutId)

  await prisma.workoutSession.update({
    where: { id: workoutId },
    data: { status: "COMPLETED" },
  })

  // Gather every PB set in this session for a post-workout digest. No email
  // provider is configured yet — assemble the payload now, wire delivery later.
  const sessionPbs = await collectSessionPbs(workoutId)
  if (sessionPbs.length > 0) {
    // TODO: send digest email ("you beat N of your bests today") via an email
    // provider (e.g. Resend). For now the data is computed and available here.
  }

  revalidatePath(`/workouts/${workoutId}`)
}

export async function reopenWorkout(workoutId: string) {
  await requireTrainerOrOwner(workoutId)

  await prisma.workoutSession.update({
    where: { id: workoutId },
    data: { status: "IN_PROGRESS" },
  })

  revalidatePath(`/workouts/${workoutId}`)
}

export async function updateExerciseTargets(
    exerciseId: string,
    workoutId: string,
    formData: FormData
  ) {
    await requireTrainer()

    const parsed = updateTargetsSchema.safeParse({
      targetReps: formData.get("targetReps"),
      targetWeight: formData.get("targetWeight"),
      targetDuration: formData.get("targetDuration"),
      modifier: formData.get("modifier") || null,
    })

    if (!parsed.success) {
      return { error: parsed.error.issues[0].message }
    }

    await prisma.setExercise.update({
      where: { id: exerciseId },
      data: parsed.data,
    })

    revalidatePath(`/workouts/${workoutId}`)
  }

  export async function updateAllRoundsTargets(
    setId: string,
    exerciseId: string,
    order: number,
    workoutId: string,
    formData: FormData
  ) {
    await requireTrainer()

    const parsed = updateTargetsSchema.safeParse({
      targetReps: formData.get("targetReps"),
      targetWeight: formData.get("targetWeight"),
      targetDuration: formData.get("targetDuration"),
      modifier: formData.get("modifier") || null,
    })

    if (!parsed.success) {
      return { error: parsed.error.issues[0].message }
    }

    await prisma.setExercise.updateMany({
      where: {
        workoutSetId: setId,
        exerciseId,
        order,
      },
      data: parsed.data,
    })

    revalidatePath(`/workouts/${workoutId}`)
  }

  export async function deleteWorkout(workoutId: string) {
    await requireTrainer()

    await prisma.workoutSession.delete({
      where: { id: workoutId },
    })

    return { success: true }
  }

  export async function createExercise(formData: FormData) {
    await requireTrainer()

    const name = formData.get("name") as string
    const category = formData.get("category") as string | null
    const primaryMuscle = formData.get("primaryMuscle") as string | null
    const equipment = formData.get("equipment") as string | null

    if (!name) {
      return { error: "Name is required" }
    }

    const exercise = await prisma.exercise.create({
      data: {
        name,
        category: category || null,
        primaryMuscle: primaryMuscle || null,
        equipment: equipment || null,
        source: "CUSTOM",
      },
    })

    return { success: true, exercise }
  }

  export async function updateWorkoutDetails(
    workoutId: string,
    formData: FormData
  ) {
    await requireTrainer()

    const date = formData.get("date") as string
    const trainerId = formData.get("trainerId") as string | null

    await prisma.workoutSession.update({
      where: { id: workoutId },
      data: {
        // Client sends a full UTC ISO instant converted from local date/time.
        date: new Date(date),
        trainerId: trainerId && trainerId !== "none" ? trainerId : null,
      },
    })

    revalidatePath(`/workouts/${workoutId}`)
  }