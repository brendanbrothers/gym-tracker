import { notFound, redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { Metadata } from "next"
import { authOptions, isTrainer as checkTrainer } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { formatWorkoutWeekday } from "@/lib/utils"
import { WorkoutEditor } from "./workout-editor"
import { ReferencePane } from "./reference-pane"
import { getReferenceCandidates, getWeekSessionsForClient } from "../actions"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params

  const workout = await prisma.workoutSession.findUnique({
    where: { id },
    select: { client: { select: { name: true } } },
  })

  if (!workout) {
    return { title: "Workout | Gym Tracker" }
  }

  const firstName = workout.client.name.split(" ")[0]
  return { title: `${firstName} | Gym Tracker` }
}

export default async function WorkoutPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await getServerSession(authOptions)

  const workout = await prisma.workoutSession.findUnique({
    where: { id },
    include: {
      client: true,
      trainer: true,
      sets: {
        orderBy: { order: "asc" },
        include: {
          exercises: {
            orderBy: [{ order: "asc" }, { round: "asc" }],
            include: {
              exercise: true,
            },
          },
        },
      },
    },
  })

  if (!workout) {
    notFound()
  }

  const isTrainer = checkTrainer(session?.user.role)
  const isOwner = workout.clientId === session?.user.id

  // Access control: clients can only see their own workouts
  if (!isTrainer && !isOwner) {
    redirect("/workouts")
  }

  const exercises = await prisma.exercise.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  })

  const trainers = await prisma.user.findMany({
    where: { role: { in: ["TRAINER", "ADMIN"] } },
    orderBy: { name: "asc" },
  })

  // The reference pane and repeat warnings are an authoring aid for trainers
  // while a workout is still being built or run — so they show for SCHEDULED and
  // IN_PROGRESS (real-time tweaks), but not once it's COMPLETED/CANCELLED or for
  // clients, where it's a plain editor.
  const showBuildView =
    isTrainer &&
    (workout.status === "SCHEDULED" || workout.status === "IN_PROGRESS")
  if (!showBuildView) {
    return (
      <div className="p-6">
        <WorkoutEditor
          workout={workout}
          exercises={exercises}
          trainers={trainers}
          isTrainer={isTrainer}
          isOwner={isOwner}
        />
      </div>
    )
  }

  // Trainer build view: reference pane (left) + live editor (right).
  const [referenceCandidates, weekSessions] = await Promise.all([
    getReferenceCandidates(workout.clientId, workout.date, workout.id),
    getWeekSessionsForClient(workout.clientId, workout.date, workout.id),
  ])

  // Which exercises this client already has elsewhere in the same Mon–Sun week,
  // with the day(s) and any modifier, for the "already done this week" warning.
  const exercisesDoneThisWeek: Record<
    string,
    { day: string; modifier: string | null }[]
  > = {}
  for (const s of weekSessions) {
    const day = formatWorkoutWeekday(s.date)
    for (const set of s.sets) {
      for (const ex of set.exercises) {
        const arr = (exercisesDoneThisWeek[ex.exerciseId] ??= [])
        const modifier = ex.modifier ?? null
        if (!arr.some((e) => e.day === day && e.modifier === modifier)) {
          arr.push({ day, modifier })
        }
      }
    }
  }

  return (
    <div className="flex gap-6 p-6">
      <ReferencePane
        candidates={referenceCandidates}
        currentSessionId={workout.id}
        clientName={workout.client.name.split(" ")[0]}
        targetIsEmpty={workout.sets.length === 0}
        className="w-[420px] shrink-0"
      />
      <div className="min-w-0 flex-1 px-6">
        <WorkoutEditor
          workout={workout}
          exercises={exercises}
          trainers={trainers}
          isTrainer={isTrainer}
          isOwner={isOwner}
          exercisesDoneThisWeek={exercisesDoneThisWeek}
        />
      </div>
    </div>
  )
}