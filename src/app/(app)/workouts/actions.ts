"use server"

import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function createWorkout(formData: FormData) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return { error: "Unauthorized" }
  }

  // Only trainers and admins can create workouts
  if (session.user.role !== "TRAINER" && session.user.role !== "ADMIN") {
    return { error: "Unauthorized: Only trainers can create workouts" }
  }

  const clientId = formData.get("clientId") as string
  const trainerId = formData.get("trainerId") as string | null
  const copyFromId = formData.get("copyFromId") as string | null
  const dateStr = formData.get("date") as string | null

  if (!clientId) {
    return { error: "Client is required" }
  }

  // Parse date or default to today
  const date = dateStr ? new Date(dateStr + "T00:00:00") : new Date()

  const workout = await prisma.workoutSession.create({
    data: {
      date,
      clientId,
      trainerId: trainerId || null,
      status: "IN_PROGRESS",
    },
  })

  // Copy sets and exercises from previous workout if selected
  if (copyFromId) {
    const sourceWorkout = await prisma.workoutSession.findUnique({
      where: { id: copyFromId },
      include: {
        sets: {
          orderBy: { order: "asc" },
          include: {
            exercises: {
              orderBy: [{ order: "asc" }, { round: "asc" }],
            },
          },
        },
      },
    })

    if (sourceWorkout) {
      for (const set of sourceWorkout.sets) {
        const newSet = await prisma.workoutSet.create({
          data: {
            workoutSessionId: workout.id,
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
              targetReps: exercise.targetReps,
              targetWeight: exercise.targetWeight,
              targetDuration: exercise.targetDuration,
              // Don't copy actuals - those are for the new workout to fill in
              completed: false,
            },
          })
        }
      }
    }
  }

  redirect(`/workouts/${workout.id}`)
}

export async function getRecentWorkoutsForClient(clientId: string) {
  return prisma.workoutSession.findMany({
    where: {
      clientId,
      status: "COMPLETED",
    },
    include: {
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
    orderBy: { date: "desc" },
    take: 10,
  })
}