import { prisma } from "@/lib/db"
import { ExerciseFilters } from "./exercise-filters"
import { getFilterOptions } from "./actions"

export default async function ExercisesPage() {
  const exercises = await prisma.exercise.findMany({
    orderBy: { name: "asc" },
    take: 50,
  })

  const filterOptions = await getFilterOptions()

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Exercises</h1>
      <ExerciseFilters 
        initialExercises={exercises} 
        filterOptions={filterOptions} 
      />
    </div>
  )
}