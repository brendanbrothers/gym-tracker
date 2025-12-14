"use server"

import { prisma } from "@/lib/db"

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