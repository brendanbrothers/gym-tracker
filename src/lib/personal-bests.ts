import { prisma } from "@/lib/db"

// Personal bests are not a single number. Each exercise carries a different
// notion of "best" depending on what data its rounds record. We derive a small
// family of records from whatever actuals are present — no need to pre-tag an
// exercise with a type. A PB is always scoped per (client, exercise) and is
// computed over completed rounds across all-time history.

export type PbMetric =
  | "est1RM" // weight × (1 + reps/30), the comparable "are you stronger?" number
  | "maxWeight" // heaviest single set
  | "bestVolume" // weight × reps in a single set
  | "maxRepsUnbroken" // most reps in one round — 14 straight beats 8+8+6
  | "maxDuration" // longest hold
  | "totalRepsTarget" // most total reps for a target broken across rounds (8+8+6 = 22)

// Single-round metrics are evaluated the moment a round is completed. Group
// metrics need the whole set-group, so they're only surfaced once that's known
// (progress page / workout completion).
const SINGLE_ROUND_METRICS: PbMetric[] = [
  "est1RM",
  "maxWeight",
  "bestVolume",
  "maxRepsUnbroken",
  "maxDuration",
]

const PB_LABELS: Record<PbMetric, string> = {
  est1RM: "estimated 1-rep max",
  maxWeight: "heaviest weight",
  bestVolume: "best volume",
  maxRepsUnbroken: "most reps",
  maxDuration: "longest hold",
  totalRepsTarget: "most total reps",
}

export function pbMetricLabel(metric: PbMetric): string {
  return PB_LABELS[metric]
}

export type PbRecord = {
  value: number
  date: string
  // The round that holds the record. null for group-level metrics (totalRepsTarget).
  setExerciseId: string | null
}

export type PersonalBests = Partial<Record<PbMetric, PbRecord>>

export type PbHit = {
  metric: PbMetric
  newValue: number
  previousValue: number | null
  delta: number | null
}

// Epley formula. Collapses a (weight, reps) pair into one comparable strength
// number so 100×5 and 120×1 can be ranked against each other.
export function estimate1RM(weight: number, reps: number): number {
  if (reps < 1) return weight
  return weight * (1 + reps / 30)
}

export type RoundLike = {
  id: string
  workoutSetId: string
  order: number
  actualReps: number | null
  actualWeight: number | null
  actualDuration: number | null
  date: string
}

// Pure: given a set of completed rounds, compute the current record per metric.
export function computePersonalBests(rounds: RoundLike[]): PersonalBests {
  const pbs: PersonalBests = {}

  const consider = (
    metric: PbMetric,
    value: number,
    date: string,
    setExerciseId: string | null
  ) => {
    const current = pbs[metric]
    if (!current || value > current.value) {
      pbs[metric] = { value, date, setExerciseId }
    }
  }

  for (const r of rounds) {
    const hasWeight = r.actualWeight !== null
    const hasReps = r.actualReps !== null

    if (hasWeight) {
      consider("maxWeight", r.actualWeight!, r.date, r.id)
    }
    if (hasWeight && hasReps && r.actualReps! > 0) {
      consider("est1RM", estimate1RM(r.actualWeight!, r.actualReps!), r.date, r.id)
      consider("bestVolume", r.actualWeight! * r.actualReps!, r.date, r.id)
    }
    if (hasReps) {
      consider("maxRepsUnbroken", r.actualReps!, r.date, r.id)
    }
    if (r.actualDuration !== null) {
      consider("maxDuration", r.actualDuration, r.date, r.id)
    }
  }

  // Total reps for a target: rounds sharing (workoutSetId, order) are the pieces
  // a single prescription was broken into. Sum their reps and take the max group.
  const groups = new Map<string, { total: number; date: string }>()
  for (const r of rounds) {
    if (r.actualReps === null) continue
    const key = `${r.workoutSetId}::${r.order}`
    const g = groups.get(key) ?? { total: 0, date: r.date }
    g.total += r.actualReps
    groups.set(key, g)
  }
  for (const g of groups.values()) {
    consider("totalRepsTarget", g.total, g.date, null)
  }

  return pbs
}

function toRoundLike(ex: {
  id: string
  workoutSetId: string
  order: number
  actualReps: number | null
  actualWeight: number | null
  actualDuration: number | null
  workoutSet: { workoutSession: { date: Date } }
}): RoundLike {
  return {
    id: ex.id,
    workoutSetId: ex.workoutSetId,
    order: ex.order,
    actualReps: ex.actualReps,
    actualWeight: ex.actualWeight,
    actualDuration: ex.actualDuration,
    date: ex.workoutSet.workoutSession.date.toISOString().split("T")[0],
  }
}

const ROUND_INCLUDE = {
  workoutSet: { include: { workoutSession: { select: { date: true } } } },
} as const

// All-time PBs for a client+exercise. Returns {} when no client is given
// (PBs are per-client, so a mixed "all clients" view has no single answer).
export async function getPersonalBests(
  exerciseId: string,
  clientId?: string
): Promise<PersonalBests> {
  if (!clientId) return {}

  const rows = await prisma.setExercise.findMany({
    where: {
      exerciseId,
      completed: true,
      workoutSet: { workoutSession: { clientId } },
    },
    include: ROUND_INCLUDE,
  })

  return computePersonalBests(rows.map(toRoundLike))
}

// Compare a just-completed round against the client's prior bests (excluding the
// round itself) and return which single-round metrics it newly beats. Used for
// the in-the-moment celebration on the workout-entry page.
export async function evaluateRoundForPb(params: {
  exerciseId: string
  clientId: string
  setExerciseId: string
  actualReps: number | null
  actualWeight: number | null
  actualDuration: number | null
}): Promise<PbHit[]> {
  const rows = await prisma.setExercise.findMany({
    where: {
      exerciseId: params.exerciseId,
      completed: true,
      id: { not: params.setExerciseId },
      workoutSet: { workoutSession: { clientId: params.clientId } },
    },
    include: ROUND_INCLUDE,
  })

  const prior = computePersonalBests(rows.map(toRoundLike))
  const hits: PbHit[] = []

  const check = (metric: PbMetric, value: number) => {
    const prev = prior[metric]?.value ?? null
    if (prev === null || value > prev) {
      hits.push({
        metric,
        newValue: value,
        previousValue: prev,
        delta: prev === null ? null : value - prev,
      })
    }
  }

  const { actualReps: reps, actualWeight: weight, actualDuration: dur } = params
  if (weight !== null) check("maxWeight", weight)
  if (weight !== null && reps !== null && reps > 0) {
    check("est1RM", estimate1RM(weight, reps))
    check("bestVolume", weight * reps)
  }
  if (reps !== null) check("maxRepsUnbroken", reps)
  if (dur !== null) check("maxDuration", dur)

  return hits.filter((h) => SINGLE_ROUND_METRICS.includes(h.metric))
}

export type SessionPb = PbHit & { setExerciseId: string; exerciseName: string }

// All PBs achieved in a single session, comparing each completed round against
// the client's history excluding this session. Includes group metrics. Built for
// a post-workout digest email — assembled now, delivery wired up later.
export async function collectSessionPbs(sessionId: string): Promise<SessionPb[]> {
  const session = await prisma.workoutSession.findUnique({
    where: { id: sessionId },
    select: {
      clientId: true,
      sets: {
        select: {
          exercises: {
            where: { completed: true },
            select: {
              id: true,
              exerciseId: true,
              workoutSetId: true,
              order: true,
              actualReps: true,
              actualWeight: true,
              actualDuration: true,
              exercise: { select: { name: true } },
            },
          },
        },
      },
    },
  })

  if (!session) return []

  const allExercises = session.sets.flatMap((s) => s.exercises)
  const sessionRoundIds = new Set(allExercises.map((e) => e.id))
  const exerciseIds = [...new Set(allExercises.map((e) => e.exerciseId))]
  const results: SessionPb[] = []

  for (const exerciseId of exerciseIds) {
    const exerciseName =
      allExercises.find((e) => e.exerciseId === exerciseId)?.exercise.name ?? ""

    // Prior bests: this client's completed rounds for the exercise, excluding the
    // rounds logged in this session.
    const allRows = await prisma.setExercise.findMany({
      where: {
        exerciseId,
        completed: true,
        workoutSet: { workoutSession: { clientId: session.clientId } },
      },
      include: ROUND_INCLUDE,
    })
    const prior = computePersonalBests(
      allRows.filter((r) => !sessionRoundIds.has(r.id)).map(toRoundLike)
    )

    // This session's bests, grouped correctly (so totalRepsTarget spans the
    // set-group rather than a single round).
    const sessionBests = computePersonalBests(
      allExercises
        .filter((e) => e.exerciseId === exerciseId)
        .map((e) => ({
          id: e.id,
          workoutSetId: e.workoutSetId,
          order: e.order,
          actualReps: e.actualReps,
          actualWeight: e.actualWeight,
          actualDuration: e.actualDuration,
          date: "",
        }))
    )

    for (const metric of Object.keys(sessionBests) as PbMetric[]) {
      const rec = sessionBests[metric]!
      const prev = prior[metric]?.value ?? null
      if (prev === null || rec.value > prev) {
        results.push({
          metric,
          newValue: rec.value,
          previousValue: prev,
          delta: prev === null ? null : rec.value - prev,
          setExerciseId: rec.setExerciseId ?? "",
          exerciseName,
        })
      }
    }
  }

  return results
}
