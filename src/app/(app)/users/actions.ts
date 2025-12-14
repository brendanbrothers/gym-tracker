"use server"

import { getServerSession } from "next-auth"
import bcrypt from "bcryptjs"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function createUser(formData: FormData) {
  const session = await getServerSession(authOptions)

  if (!session || !["TRAINER", "ADMIN"].includes(session.user.role)) {
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
    },
  })

  return { success: true }
}