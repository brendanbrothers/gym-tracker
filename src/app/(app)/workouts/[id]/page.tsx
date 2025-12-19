import { notFound, redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { Metadata } from "next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { WorkoutEditor } from "./workout-editor"

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

  const isTrainer = session?.user.role === "TRAINER" || session?.user.role === "GYM_ADMIN" || session?.user.role === "ADMIN"
  const isOwner = workout.clientId === session?.user.id

  // Access control: clients can only see their own workouts
  if (!isTrainer && !isOwner) {
    redirect("/workouts")
  }

  const exercises = await prisma.exercise.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    take: 100,
  })

  const trainers = await prisma.user.findMany({
    where: { role: { in: ["TRAINER", "ADMIN"] } },
    orderBy: { name: "asc" },
  })

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