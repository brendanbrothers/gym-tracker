"use server"

import { getServerSession } from "next-auth"
import { revalidatePath } from "next/cache"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { authOptions, isTrainer } from "@/lib/auth"
import { prisma } from "@/lib/db"

const createUserSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["CLIENT", "TRAINER", "GYM_ADMIN", "ADMIN"]),
})

const updateUserSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters").optional().or(z.literal("")),
})

export async function createUser(formData: FormData) {
  const session = await getServerSession(authOptions)

  if (!session || !isTrainer(session.user.role)) {
    return { error: "Unauthorized" }
  }

  const parsed = createUserSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { name, email, password, role } = parsed.data

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
      role,
      gymId: session.user.gymId,
    },
  })

  return { success: true }
}

export async function updateUser(userId: string, formData: FormData) {
  const session = await getServerSession(authOptions)

  if (!session || !isTrainer(session.user.role)) {
    return { error: "Unauthorized" }
  }

  const parsed = updateUserSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password") || "",
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { name, email, password: newPassword } = parsed.data

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

  if (!session || !isTrainer(session.user.role)) {
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

  if (!session || !isTrainer(session.user.role)) {
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