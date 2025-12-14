"use server"

import { prisma } from "@/lib/db"

export async function getProgressData(exerciseId: string, clientId?: string) {
  const setExercises = await prisma.setExercise.findMany({
    where: {
      exerciseId,
      completed: true,
      workoutSet: {
        workoutSession: clientId ? { clientId } : {},
      },
    },
    include: {
      workoutSet: {
        include: {
          workoutSession: {
            include: {
              client: true,
            },
          },
        },
      },
    },
    orderBy: {
      workoutSet: {
        workoutSession: {
          date: "asc",
        },
      },
    },
  })

  // Group by date and calculate averages/maxes per session
  const sessionData = new Map<string, {
    date: string
    clientName: string
    avgWeight: number
    maxWeight: number
    avgReps: number
    totalReps: number
    sets: number
  }>()

  for (const ex of setExercises) {
    const date = ex.workoutSet.workoutSession.date.toISOString().split("T")[0]
    const clientName = ex.workoutSet.workoutSession.client.name
    const key = `${date}-${clientName}`

    if (!sessionData.has(key)) {
      sessionData.set(key, {
        date,
        clientName,
        avgWeight: 0,
        maxWeight: 0,
        avgReps: 0,
        totalReps: 0,
        sets: 0,
      })
    }

    const data = sessionData.get(key)!
    if (ex.actualWeight !== null) {
      data.maxWeight = Math.max(data.maxWeight, ex.actualWeight)
      data.avgWeight = (data.avgWeight * data.sets + ex.actualWeight) / (data.sets + 1)
    }
    if (ex.actualReps !== null) {
      data.totalReps += ex.actualReps
      data.avgReps = (data.avgReps * data.sets + ex.actualReps) / (data.sets + 1)
    }
    data.sets++
  }

  return Array.from(sessionData.values()).sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  )
}

export async function getExercisesWithHistory() {
  const exercises = await prisma.exercise.findMany({
    where: {
      setExercises: {
        some: {
          completed: true,
        },
      },
    },
    orderBy: { name: "asc" },
  })

  return exercises
}

export async function getClients() {
  return prisma.user.findMany({
    where: { role: "CLIENT" },
    orderBy: { name: "asc" },
  })
}