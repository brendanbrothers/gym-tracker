import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { ProgressChart } from "./progress-chart"
import { getExercisesWithHistory, getClients } from "./actions"

export default async function ProgressPage() {
  const session = await getServerSession(authOptions)
  const isTrainer = session?.user.role === "TRAINER" || session?.user.role === "GYM_ADMIN" || session?.user.role === "ADMIN"

  const exercises = await getExercisesWithHistory()
  const clients = isTrainer ? await getClients() : []

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Progress Tracking</h1>
      <ProgressChart exercises={exercises} clients={clients} />
    </div>
  )
}