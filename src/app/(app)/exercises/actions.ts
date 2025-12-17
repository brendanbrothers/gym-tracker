"use server"

import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth"
import { prisma } from "@/lib/db"
import { authOptions } from "@/lib/auth"

export async function getExercises(params: {
  search?: string
  category?: string
  primaryMuscle?: string
  equipment?: string
}) {
  const { search, category, primaryMuscle, equipment } = params

  const exercises = await prisma.exercise.findMany({
    where: {
      AND: [
        search
          ? { name: { contains: search } }
          : {},
        category && category !== "all" ? { category } : {},
        primaryMuscle && primaryMuscle !== "all" ? { primaryMuscle } : {},
        equipment && equipment !== "all" ? { equipment } : {},
      ],
    },
    include: {
      createdBy: {
        select: { id: true, name: true },
      },
    },
    orderBy: { name: "asc" },
    take: 50,
  })

  return exercises
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
  const name = formData.get("name") as string
  const category = formData.get("category") as string | null
  const primaryMuscle = formData.get("primaryMuscle") as string | null
  const equipment = formData.get("equipment") as string | null

  if (!name) {
    return { error: "Name is required" }
  }

  // Check for duplicate name
  const existing = await prisma.exercise.findFirst({
    where: { name: { equals: name } },
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
  const name = formData.get("name") as string
  const category = formData.get("category") as string | null
  const primaryMuscle = formData.get("primaryMuscle") as string | null
  const equipment = formData.get("equipment") as string | null

  if (!name) {
    return { error: "Name is required" }
  }

  // Check for duplicate name (excluding current exercise)
  const existing = await prisma.exercise.findFirst({
    where: {
      name: { equals: name },
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