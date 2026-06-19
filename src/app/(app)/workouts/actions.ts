"use server"

import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { authOptions, isTrainer } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { appTzWeekRange } from "@/lib/utils"

export async function createWorkout(formData: FormData) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return { error: "Unauthorized" }
  }

  if (!isTrainer(session.user.role)) {
    return { error: "Unauthorized: Only trainers can create workouts" }
  }

  const clientId = formData.get("clientId") as string
  const trainerId = formData.get("trainerId") as string | null
  const dateStr = formData.get("date") as string | null

  if (!clientId) {
    return { error: "Client is required" }
  }

  // The client sends a full UTC ISO instant (converted from the trainer's local
  // date/time), so store it as-is. Fall back to now if missing.
  const date = dateStr ? new Date(dateStr) : new Date()

  // Create an empty shell. Copying from a previous workout now happens on the
  // build page (the two-pane editor), where the trainer can see the source
  // workout in full before deciding to copy it.
  const workout = await prisma.workoutSession.create({
    data: {
      date,
      clientId,
      trainerId: trainerId || null,
      status: "SCHEDULED",
    },
  })

  redirect(`/workouts/${workout.id}`)
}

// Canonical include shape for rendering a workout's full contents.
const workoutContentsInclude = {
  sets: {
    orderBy: { order: "asc" as const },
    include: {
      exercises: {
        orderBy: [{ order: "asc" as const }, { round: "asc" as const }],
        include: { exercise: true },
      },
    },
  },
}

/**
 * Copy every circuit/exercise from `sourceId` into `targetId`, seeding the new
 * targets from what the client actually performed last time (per round) so the
 * trainer sees real progression. Only copies into an empty target, and records
 * the copy lineage so we can later count how many times a workout has been run.
 */
export async function copyWorkoutContents(sourceId: string, targetId: string) {
  const session = await getServerSession(authOptions)
  if (!session || !isTrainer(session.user.role)) {
    return { error: "Unauthorized" }
  }

  const existingSets = await prisma.workoutSet.count({
    where: { workoutSessionId: targetId },
  })
  if (existingSets > 0) {
    return { error: "This workout already has circuits — clear them to copy." }
  }

  const source = await prisma.workoutSession.findUnique({
    where: { id: sourceId },
    include: {
      sets: {
        orderBy: { order: "asc" },
        include: {
          exercises: { orderBy: [{ order: "asc" }, { round: "asc" }] },
        },
      },
    },
  })
  if (!source) {
    return { error: "Source workout not found" }
  }

  for (const set of source.sets) {
    const newSet = await prisma.workoutSet.create({
      data: {
        workoutSessionId: targetId,
        order: set.order,
        notes: set.notes,
      },
    })

    for (const exercise of set.exercises) {
      await prisma.setExercise.create({
        data: {
          workoutSetId: newSet.id,
          exerciseId: exercise.exerciseId,
          order: exercise.order,
          round: exercise.round,
          modifier: exercise.modifier,
          // Seed the new targets from what was actually performed last time
          // (per round) so the trainer sees the real progression, e.g. set 1
          // @ 30 then set 2 @ 35. Fall back to the previous target when a
          // round wasn't logged. Actuals stay empty for the new session.
          targetReps: exercise.actualReps ?? exercise.targetReps,
          targetWeight: exercise.actualWeight ?? exercise.targetWeight,
          targetDuration: exercise.actualDuration ?? exercise.targetDuration,
          completed: false,
        },
      })
    }
  }

  // Record lineage so the "Nth time doing this workout" count works going
  // forward. (Older copies made before this feature have no link to follow.)
  await prisma.workoutSession.update({
    where: { id: targetId },
    data: { copiedFromId: sourceId },
  })

  revalidatePath(`/workouts/${targetId}`)
  return { success: true }
}

export async function getRecentWorkoutsForClient(clientId: string) {
  return prisma.workoutSession.findMany({
    where: {
      clientId,
      status: "COMPLETED",
    },
    include: workoutContentsInclude,
    orderBy: { date: "desc" },
    take: 10,
  })
}

/**
 * All of a client's other sessions in the same Mon–Sun week as `weekOf`,
 * across every status, excluding `excludeSessionId`. Drives both the
 * repeat-exercise warning and the reference pane's "this week" entries.
 */
export async function getWeekSessionsForClient(
  clientId: string,
  weekOf: Date,
  excludeSessionId: string
) {
  const { start, end } = appTzWeekRange(weekOf)
  return prisma.workoutSession.findMany({
    where: {
      clientId,
      date: { gte: start, lt: end },
      id: { not: excludeSessionId },
      // Cancelled sessions didn't actually happen, so they shouldn't count as
      // "already done this week" or show up as a copy source.
      status: { not: "CANCELLED" },
    },
    include: workoutContentsInclude,
    orderBy: { date: "asc" },
  })
}

/**
 * Walk the copy chain backward from `sessionId`, returning how many sessions
 * are in the chain (count, including this one) and the date of the earliest
 * one. A `seen` set guards against an accidental cycle; the depth cap is a
 * cheap backstop. Chains are short in practice (one DB round-trip per hop).
 * TODO: a future "clients due for a change" view could flag clients whose most
 * recent session has a long chain (high count). For very long chains, swap this
 * for a single recursive CTE.
 */
export async function getCopyLineage(sessionId: string) {
  let id: string | null = sessionId
  let count = 0
  let firstRunDate: Date | null = null
  const seen = new Set<string>()

  while (id && !seen.has(id) && count < 100) {
    seen.add(id)
    const node: { date: Date; copiedFromId: string | null } | null =
      await prisma.workoutSession.findUnique({
        where: { id },
        select: { date: true, copiedFromId: true },
      })
    if (!node) break
    count++
    firstRunDate = node.date
    id = node.copiedFromId
  }

  return { count, firstRunDate }
}

export type ReferenceCandidate = Awaited<
  ReturnType<typeof getRecentWorkoutsForClient>
>[number] & {
  // If this workout were copied into the new session, it would be the client's
  // Nth run; firstRunDate is the start of its copy chain.
  nextRunN: number
  firstRunDate: Date | null
}

/**
 * Workouts the trainer can use as a reference / copy source on the build page:
 * the client's recent completed sessions plus their other sessions this week
 * (any status), deduped and newest-first, each annotated with its copy-lineage
 * count.
 */
export async function getReferenceCandidates(
  clientId: string,
  weekOf: Date,
  excludeSessionId: string
): Promise<ReferenceCandidate[]> {
  const [recent, week] = await Promise.all([
    getRecentWorkoutsForClient(clientId),
    getWeekSessionsForClient(clientId, weekOf, excludeSessionId),
  ])

  const byId = new Map<string, (typeof recent)[number]>()
  for (const w of [...week, ...recent]) {
    if (w.id !== excludeSessionId) byId.set(w.id, w)
  }

  const merged = Array.from(byId.values()).sort(
    (a, b) => b.date.getTime() - a.date.getTime()
  )

  return Promise.all(
    merged.map(async (w) => {
      const { count, firstRunDate } = await getCopyLineage(w.id)
      return { ...w, nextRunN: count + 1, firstRunDate }
    })
  )
}
