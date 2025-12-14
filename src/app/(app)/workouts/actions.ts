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

  const clientId = formData.get("clientId") as string
  const trainerId = formData.get("trainerId") as string | null

  if (!clientId) {
    return { error: "Client is required" }
  }

  const workout = await prisma.workoutSession.create({
    data: {
      date: new Date(),
      clientId,
      trainerId: trainerId || null,
      status: "IN_PROGRESS",
    },
  })

  redirect(`/workouts/${workout.id}`)
}