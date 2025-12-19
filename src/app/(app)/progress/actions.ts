"use server"

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function getProgressData(
  exerciseId: string,
  clientId?: string,
  startDate?: string,
  endDate?: string
) {
  const session = await getServerSession(authOptions)
  const isTrainer = session?.user.role === "TRAINER" || session?.user.role === "GYM_ADMIN" || session?.user.role === "ADMIN"

  // For non-trainers, always filter by their own clientId
  const effectiveClientId = isTrainer ? clientId : session?.user.id

  // Build date filter
  const dateFilter: { gte?: Date; lte?: Date } = {}
  if (startDate) {
    dateFilter.gte = new Date(startDate)
  }
  if (endDate) {
    dateFilter.lte = new Date(endDate + "T23:59:59")
  } else if (startDate) {
    // If only start date specified, go to today
    dateFilter.lte = new Date()
  }

  const setExercises = await prisma.setExercise.findMany({
    where: {
      exerciseId,
      completed: true,
      workoutSet: {
        workoutSession: {
          ...(effectiveClientId ? { clientId: effectiveClientId } : {}),
          ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {}),
        },
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
  const session = await getServerSession(authOptions)
  const isTrainer = session?.user.role === "TRAINER" || session?.user.role === "GYM_ADMIN" || session?.user.role === "ADMIN"

  const exercises = await prisma.exercise.findMany({
    where: {
      setExercises: {
        some: {
          completed: true,
          // For non-trainers, only show exercises they have completed
          ...(isTrainer ? {} : {
            workoutSet: {
              workoutSession: {
                clientId: session?.user.id,
              },
            },
          }),
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