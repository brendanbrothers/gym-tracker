"use server"

import { getServerSession } from "next-auth"
import { authOptions, isTrainer } from "@/lib/auth"
import { prisma } from "@/lib/db"
import {
  estimate1RM,
  getPersonalBests,
  type PbMetric,
} from "@/lib/personal-bests"
import { dateAndTimeToISO, toDateValue } from "@/lib/utils"

export async function getProgressData(
  exerciseId: string,
  clientId?: string,
  startDate?: string,
  endDate?: string
) {
  const session = await getServerSession(authOptions)
  const userIsTrainer = isTrainer(session?.user.role)

  // For non-trainers, always filter by their own clientId
  const effectiveClientId = userIsTrainer ? clientId : session?.user.id

  // Build date filter
  const dateFilter: { gte?: Date; lte?: Date } = {}
  if (startDate) {
    dateFilter.gte = new Date(dateAndTimeToISO(startDate, "00:00"))
  }
  if (endDate) {
    dateFilter.lte = new Date(dateAndTimeToISO(endDate, "23:59"))
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
    const date = toDateValue(ex.workoutSet.workoutSession.date)
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

export async function getExerciseSetHistory(
  exerciseId: string,
  clientId?: string,
  startDate?: string,
  endDate?: string
) {
  const session = await getServerSession(authOptions)
  const userIsTrainer = isTrainer(session?.user.role)

  // For non-trainers, always filter by their own clientId
  const effectiveClientId = userIsTrainer ? clientId : session?.user.id

  // Build date filter
  const dateFilter: { gte?: Date; lte?: Date } = {}
  if (startDate) {
    dateFilter.gte = new Date(dateAndTimeToISO(startDate, "00:00"))
  }
  if (endDate) {
    dateFilter.lte = new Date(dateAndTimeToISO(endDate, "23:59"))
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
          date: "desc",
        },
      },
    },
  })

  // True all-time PBs (ignores the date filter above) so the table stars real
  // records, not just the best within the visible range. Per-client only.
  const personalBests = await getPersonalBests(exerciseId, effectiveClientId)
  const pbByRound = new Map<string, PbMetric[]>()
  for (const [metric, record] of Object.entries(personalBests)) {
    if (!record?.setExerciseId) continue
    const list = pbByRound.get(record.setExerciseId) ?? []
    list.push(metric as PbMetric)
    pbByRound.set(record.setExerciseId, list)
  }

  const rows = setExercises.map((ex) => ({
    id: ex.id,
    date: toDateValue(ex.workoutSet.workoutSession.date),
    clientName: ex.workoutSet.workoutSession.client.name,
    round: ex.round,
    order: ex.order,
    targetReps: ex.targetReps,
    targetWeight: ex.targetWeight,
    targetDuration: ex.targetDuration,
    actualReps: ex.actualReps,
    actualWeight: ex.actualWeight,
    actualDuration: ex.actualDuration,
    est1RM:
      ex.actualWeight !== null && ex.actualReps !== null && ex.actualReps > 0
        ? estimate1RM(ex.actualWeight, ex.actualReps)
        : null,
    pbMetrics: pbByRound.get(ex.id) ?? [],
  }))

  return { rows, personalBests }
}

export async function getExercisesWithHistory() {
  const session = await getServerSession(authOptions)
  const userIsTrainer = isTrainer(session?.user.role)

  const exercises = await prisma.exercise.findMany({
    where: {
      setExercises: {
        some: {
          completed: true,
          // For non-trainers, only show exercises they have completed
          ...(userIsTrainer ? {} : {
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