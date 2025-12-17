"use server"

import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

function isTrainerOrAdmin(role: string | undefined): boolean {
  return role === "TRAINER" || role === "ADMIN"
}

async function getWorkoutOwner(workoutId: string): Promise<string | null> {
  const workout = await prisma.workoutSession.findUnique({
    where: { id: workoutId },
    select: { clientId: true },
  })
  return workout?.clientId ?? null
}

async function requireTrainer() {
  const session = await getServerSession(authOptions)
  if (!session || !isTrainerOrAdmin(session.user.role)) {
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
  const isTrainer = isTrainerOrAdmin(session.user.role)
  if (!isOwner && !isTrainer) {
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

    const exerciseId = formData.get("exerciseId") as string
    const modifier = formData.get("modifier") as string | null
    const targetReps = formData.get("targetReps") as string | null
    const targetWeight = formData.get("targetWeight") as string | null
    const targetDuration = formData.get("targetDuration") as string | null
    const rounds = parseInt(formData.get("rounds") as string) || 1
  
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
          targetReps: targetReps ? parseInt(targetReps) : null,
          targetWeight: targetWeight ? parseFloat(targetWeight) : null,
          targetDuration: targetDuration ? parseInt(targetDuration) : null,
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

  const actualReps = formData.get("actualReps") as string | null
  const actualWeight = formData.get("actualWeight") as string | null
  const actualDuration = formData.get("actualDuration") as string | null
  const notes = formData.get("notes") as string | null
  const completed = formData.get("completed") === "true"

  await prisma.setExercise.update({
    where: { id: exerciseId },
    data: {
      actualReps: actualReps ? parseInt(actualReps) : null,
      actualWeight: actualWeight ? parseFloat(actualWeight) : null,
      actualDuration: actualDuration ? parseInt(actualDuration) : null,
      notes: notes || null,
      completed,
    },
  })

  revalidatePath(`/workouts/${workoutId}`)
}

export async function deleteExercise(exerciseId: string, workoutId: string) {
  await requireTrainer()

  await prisma.setExercise.delete({
    where: { id: exerciseId },
  })

  revalidatePath(`/workouts/${workoutId}`)
}

export async function completeWorkout(workoutId: string) {
  await requireTrainerOrOwner(workoutId)

  await prisma.workoutSession.update({
    where: { id: workoutId },
    data: { status: "COMPLETED" },
  })

  revalidatePath(`/workouts/${workoutId}`)
}

export async function updateExerciseTargets(
    exerciseId: string,
    workoutId: string,
    formData: FormData
  ) {
    await requireTrainer()

    const targetReps = formData.get("targetReps") as string | null
    const targetWeight = formData.get("targetWeight") as string | null
    const targetDuration = formData.get("targetDuration") as string | null
    const modifier = formData.get("modifier") as string | null
  
    await prisma.setExercise.update({
      where: { id: exerciseId },
      data: {
        targetReps: targetReps ? parseInt(targetReps) : null,
        targetWeight: targetWeight ? parseFloat(targetWeight) : null,
        targetDuration: targetDuration ? parseInt(targetDuration) : null,
        modifier: modifier || null,
      },
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

    const targetReps = formData.get("targetReps") as string | null
    const targetWeight = formData.get("targetWeight") as string | null
    const targetDuration = formData.get("targetDuration") as string | null
    const modifier = formData.get("modifier") as string | null
  
    await prisma.setExercise.updateMany({
      where: {
        workoutSetId: setId,
        exerciseId,
        order,
      },
      data: {
        targetReps: targetReps ? parseInt(targetReps) : null,
        targetWeight: targetWeight ? parseFloat(targetWeight) : null,
        targetDuration: targetDuration ? parseInt(targetDuration) : null,
        modifier: modifier || null,
      },
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
        date: new Date(date + "T00:00:00"),
        trainerId: trainerId && trainerId !== "none" ? trainerId : null,
      },
    })

    revalidatePath(`/workouts/${workoutId}`)
  }