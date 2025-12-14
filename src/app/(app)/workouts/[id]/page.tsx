import { notFound } from "next/navigation"
import { prisma } from "@/lib/db"
import { WorkoutEditor } from "./workout-editor"

export default async function WorkoutPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  
  const workout = await prisma.workoutSession.findUnique({
    where: { id },
    include: {
      client: true,
      trainer: true,
      sets: {
        orderBy: { order: "asc" },
        include: {
          exercises: {
            orderBy: { order: "asc" },
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

  const exercises = await prisma.exercise.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    take: 100,
  })

  return (
    <div className="p-6">
      <WorkoutEditor workout={workout} exercises={exercises} />
    </div>
  )
}