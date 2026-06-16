"use server"

import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth"
import { z } from "zod"
import { prisma } from "@/lib/db"
import { authOptions, isTrainer } from "@/lib/auth"

const exerciseSchema = z.object({
  name: z.string().min(1, "Name is required").max(100).trim(),
  category: z.string().optional().nullable(),
  primaryMuscle: z.string().optional().nullable(),
  equipment: z.string().optional().nullable(),
})

const EXERCISES_PAGE_SIZE = 20

export async function getExercises(params: {
  search?: string
  category?: string
  primaryMuscle?: string
  equipment?: string
  page?: number
}) {
  const { search, category, primaryMuscle, equipment, page = 1 } = params

  const where = {
    AND: [
      search ? { name: { contains: search, mode: "insensitive" as const } } : {},
      category && category !== "all" ? { category } : {},
      primaryMuscle && primaryMuscle !== "all" ? { primaryMuscle } : {},
      equipment && equipment !== "all" ? { equipment } : {},
    ],
  }

  const totalCount = await prisma.exercise.count({ where })
  const totalPages = Math.max(1, Math.ceil(totalCount / EXERCISES_PAGE_SIZE))
  const currentPage = Math.min(Math.max(1, page), totalPages)

  const exercises = await prisma.exercise.findMany({
    where,
    include: {
      createdBy: {
        select: { id: true, name: true },
      },
    },
    orderBy: { name: "asc" },
    skip: (currentPage - 1) * EXERCISES_PAGE_SIZE,
    take: EXERCISES_PAGE_SIZE,
  })

  return { exercises, totalCount, page: currentPage, pageSize: EXERCISES_PAGE_SIZE }
}

export async function getFilterOptions() {
  const categories = await prisma.exercise.findMany({
    where: { category: { not: null } },
    select: { category: true },
    distinct: ["category"],
    orderBy: { category: "asc" },
  })

  const muscles = await prisma.exercise.findMany({
    where: { primaryMuscle: { not: null } },
    select: { primaryMuscle: true },
    distinct: ["primaryMuscle"],
    orderBy: { primaryMuscle: "asc" },
  })

  const equipmentList = await prisma.exercise.findMany({
    where: { equipment: { not: null } },
    select: { equipment: true },
    distinct: ["equipment"],
    orderBy: { equipment: "asc" },
  })

  return {
    categories: categories.map((c) => c.category as string),
    muscles: muscles.map((m) => m.primaryMuscle as string),
    equipment: equipmentList.map((e) => e.equipment as string),
  }
}

export async function createExercise(formData: FormData) {
  const session = await getServerSession(authOptions)

  if (!session || !isTrainer(session.user.role)) {
    return { error: "Unauthorized: Only trainers can create exercises" }
  }

  const parsed = exerciseSchema.safeParse({
    name: formData.get("name"),
    category: formData.get("category") || null,
    primaryMuscle: formData.get("primaryMuscle") || null,
    equipment: formData.get("equipment") || null,
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { name, category, primaryMuscle, equipment } = parsed.data

  // Check for duplicate name
  const existing = await prisma.exercise.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
  })

  if (existing) {
    return { error: "An exercise with this name already exists" }
  }

  const exercise = await prisma.exercise.create({
    data: {
      name,
      category: category || null,
      primaryMuscle: primaryMuscle || null,
      equipment: equipment || null,
      source: "CUSTOM",
      createdById: session?.user?.id || null,
    },
    include: {
      createdBy: {
        select: { id: true, name: true },
      },
    },
  })

  revalidatePath("/exercises")
  return { success: true, exercise }
}

export async function updateExercise(exerciseId: string, formData: FormData) {
  const session = await getServerSession(authOptions)

  if (!session || !isTrainer(session.user.role)) {
    return { error: "Unauthorized: Only trainers can update exercises" }
  }

  const parsed = exerciseSchema.safeParse({
    name: formData.get("name"),
    category: formData.get("category") || null,
    primaryMuscle: formData.get("primaryMuscle") || null,
    equipment: formData.get("equipment") || null,
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { name, category, primaryMuscle, equipment } = parsed.data

  // Check for duplicate name (excluding current exercise)
  const existing = await prisma.exercise.findFirst({
    where: {
      name: { equals: name, mode: "insensitive" },
      id: { not: exerciseId },
    },
  })

  if (existing) {
    return { error: "An exercise with this name already exists" }
  }

  const exercise = await prisma.exercise.update({
    where: { id: exerciseId },
    data: {
      name,
      category: category && category !== "none" ? category : null,
      primaryMuscle: primaryMuscle && primaryMuscle !== "none" ? primaryMuscle : null,
      equipment: equipment && equipment !== "none" ? equipment : null,
    },
    include: {
      createdBy: {
        select: { id: true, name: true },
      },
    },
  })

  revalidatePath("/exercises")
  return { success: true, exercise }
}

export async function deleteExercise(exerciseId: string) {
  const session = await getServerSession(authOptions)

  if (!session || !isTrainer(session.user.role)) {
    return { error: "Unauthorized: Only trainers can delete exercises" }
  }

  // Check if exercise is used in any workout
  const usageCount = await prisma.setExercise.count({
    where: { exerciseId },
  })

  if (usageCount > 0) {
    return { 
      error: `Cannot delete: this exercise is used in ${usageCount} workout${usageCount > 1 ? "s" : ""}` 
    }
  }

  await prisma.exercise.delete({
    where: { id: exerciseId },
  })

  revalidatePath("/exercises")
  return { success: true }
}