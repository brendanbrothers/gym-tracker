"use server"

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function getGymBranding() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.gymId) {
    return null
  }

  const gym = await prisma.gym.findUnique({
    where: { id: session.user.gymId },
    select: { name: true, logo: true },
  })

  return gym
}
