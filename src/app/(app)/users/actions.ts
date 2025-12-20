"use server"

import { getServerSession } from "next-auth"
import { revalidatePath } from "next/cache"
import bcrypt from "bcryptjs"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function createUser(formData: FormData) {
  const session = await getServerSession(authOptions)

  if (!session || !["TRAINER", "GYM_ADMIN", "ADMIN"].includes(session.user.role)) {
    return { error: "Unauthorized" }
  }

  const name = formData.get("name") as string
  const email = formData.get("email") as string
  const password = formData.get("password") as string
  const role = formData.get("role") as string

  if (!name || !email || !password || !role) {
    return { error: "All fields are required" }
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
  })

  if (existingUser) {
    return { error: "User with this email already exists" }
  }

  const hashedPassword = await bcrypt.hash(password, 10)

  await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      role: role as "CLIENT" | "TRAINER" | "ADMIN",
      gymId: session.user.gymId,
    },
  })

  return { success: true }
}

export async function updateUser(userId: string, formData: FormData) {
  const session = await getServerSession(authOptions)

  if (!session || !["TRAINER", "GYM_ADMIN", "ADMIN"].includes(session.user.role)) {
    return { error: "Unauthorized" }
  }

  const name = formData.get("name") as string
  const email = formData.get("email") as string
  const newPassword = formData.get("password") as string

  if (!name || !email) {
    return { error: "Name and email are required" }
  }

  // Check if email is taken by another user
  const existingUser = await prisma.user.findUnique({
    where: { email },
  })

  if (existingUser && existingUser.id !== userId) {
    return { error: "Email is already in use by another user" }
  }

  const updateData: { name: string; email: string; password?: string } = {
    name,
    email,
  }

  // Only update password if a new one was provided
  if (newPassword && newPassword.trim().length > 0) {
    updateData.password = await bcrypt.hash(newPassword, 10)
  }

  await prisma.user.update({
    where: { id: userId },
    data: updateData,
  })

  revalidatePath("/clients")
  revalidatePath("/trainers")
  return { success: true }
}

export async function markUserAsFormer(userId: string) {
  const session = await getServerSession(authOptions)

  if (!session || !["TRAINER", "GYM_ADMIN", "ADMIN"].includes(session.user.role)) {
    return { error: "Unauthorized" }
  }

  // Prevent marking yourself as former
  if (userId === session.user.id) {
    return { error: "You cannot mark yourself as former" }
  }

  await prisma.user.update({
    where: { id: userId },
    data: { status: "FORMER" },
  })

  revalidatePath("/clients")
  revalidatePath("/trainers")
  return { success: true }
}

export async function reactivateUser(userId: string) {
  const session = await getServerSession(authOptions)

  if (!session || !["TRAINER", "GYM_ADMIN", "ADMIN"].includes(session.user.role)) {
    return { error: "Unauthorized" }
  }

  await prisma.user.update({
    where: { id: userId },
    data: { status: "ACTIVE" },
  })

  revalidatePath("/clients")
  revalidatePath("/trainers")
  return { success: true }
}