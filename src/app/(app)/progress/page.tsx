import { getServerSession } from "next-auth"
import { authOptions, isTrainer as checkTrainer } from "@/lib/auth"
import { ProgressChart } from "./progress-chart"
import { getExercisesWithHistory, getClients } from "./actions"

export default async function ProgressPage() {
  const session = await getServerSession(authOptions)
  const isTrainer = checkTrainer(session?.user.role)

  const exercises = await getExercisesWithHistory()
  const clients = isTrainer ? await getClients() : []

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Progress Tracking</h1>
      <ProgressChart exercises={exercises} clients={clients} />
    </div>
  )
}