import { getServerSession } from "next-auth"
import { authOptions, isTrainer as checkTrainer } from "@/lib/auth"
import { ExerciseFilters } from "./exercise-filters"
import { getExercises, getFilterOptions } from "./actions"

export default async function ExercisesPage() {
  const session = await getServerSession(authOptions)
  const isTrainer = checkTrainer(session?.user.role)

  const { exercises, totalCount } = await getExercises({ page: 1 })

  const filterOptions = await getFilterOptions()

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Exercises</h1>
      <ExerciseFilters
        initialExercises={exercises}
        initialTotalCount={totalCount}
        filterOptions={filterOptions}
        isTrainer={isTrainer}
      />
    </div>
  )
}