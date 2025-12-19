"use server"

import { getServerSession } from "next-auth"
import { revalidatePath } from "next/cache"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

function canManageGym(role: string | undefined): boolean {
  return role === "GYM_ADMIN" || role === "ADMIN"
}

export async function getGym(gymId: string) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return { error: "Unauthorized" }
  }

  const gym = await prisma.gym.findUnique({
    where: { id: gymId },
    include: {
      users: {
        where: { role: "TRAINER" },
        select: { id: true, name: true, email: true },
        orderBy: { name: "asc" },
      },
    },
  })

  if (!gym) {
    return { error: "Gym not found" }
  }

  return { gym }
}

export async function updateGym(formData: FormData) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return { error: "Unauthorized" }
  }

  if (!canManageGym(session.user.role)) {
    return { error: "Only gym admins can update gym settings" }
  }

  const gymId = session.user.gymId
  if (!gymId) {
    return { error: "No gym associated with your account" }
  }

  const name = formData.get("name") as string
  const logo = formData.get("logo") as string | null

  if (!name || name.trim().length === 0) {
    return { error: "Gym name is required" }
  }

  try {
    await prisma.gym.update({
      where: { id: gymId },
      data: {
        name: name.trim(),
        logo: logo || null,
      },
    })

    revalidatePath("/gym/settings")
    revalidatePath("/")
    return { success: true }
  } catch (error) {
    console.error("Failed to update gym:", error)
    return { error: "Failed to update gym settings" }
  }
}

export async function uploadLogo(formData: FormData) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return { error: "Unauthorized" }
  }

  if (!canManageGym(session.user.role)) {
    return { error: "Only gym admins can update gym settings" }
  }

  const gymId = session.user.gymId
  if (!gymId) {
    return { error: "No gym associated with your account" }
  }

  const file = formData.get("file") as File
  if (!file) {
    return { error: "No file provided" }
  }

  // For now, we'll store as base64 data URL
  // In production, you'd upload to S3/Cloudinary/etc.
  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)
  const base64 = buffer.toString("base64")
  const mimeType = file.type
  const dataUrl = `data:${mimeType};base64,${base64}`

  try {
    await prisma.gym.update({
      where: { id: gymId },
      data: { logo: dataUrl },
    })

    revalidatePath("/gym/settings")
    revalidatePath("/")
    return { success: true, logo: dataUrl }
  } catch (error) {
    console.error("Failed to upload logo:", error)
    return { error: "Failed to upload logo" }
  }
}
