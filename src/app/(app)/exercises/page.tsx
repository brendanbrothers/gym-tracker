import { getServerSession } from "next-auth"
import { authOptions, isTrainer as checkTrainer } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { ExerciseFilters } from "./exercise-filters"
import { getFilterOptions } from "./actions"

export default async function ExercisesPage() {
  const session = await getServerSession(authOptions)
  const isTrainer = checkTrainer(session?.user.role)

  const exercises = await prisma.exercise.findMany({
    include: {
      createdBy: {
        select: { id: true, name: true },
      },
    },
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
        isTrainer={isTrainer}
      />
    </div>
  )
}