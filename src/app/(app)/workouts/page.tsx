import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { NewWorkoutForm } from "./new-workout-form"

export default async function WorkoutsPage() {
  const session = await getServerSession(authOptions)
  
  const isTrainer = session?.user.role === "TRAINER" || session?.user.role === "ADMIN"

  const workouts = await prisma.workoutSession.findMany({
    where: isTrainer ? {} : { clientId: session?.user.id },
    include: {
      client: true,
      trainer: true,
      sets: {
        include: {
          exercises: true,
        },
      },
    },
    orderBy: { date: "desc" },
    take: 20,
  })

  const clients = await prisma.user.findMany({
    where: { role: "CLIENT" },
    orderBy: { name: "asc" },
  })

  const trainers = await prisma.user.findMany({
    where: { role: { in: ["TRAINER", "ADMIN"] } },
    orderBy: { name: "asc" },
  })

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Workouts</h1>
        {isTrainer && <NewWorkoutForm clients={clients} trainers={trainers} />}
      </div>
      {workouts.length === 0 ? (
        <p className="text-muted-foreground">No workouts yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Trainer</TableHead>
              <TableHead>Sets</TableHead>
              <TableHead>Exercises</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {workouts.map((workout) => (
              <TableRow key={workout.id}>
                <TableCell>{workout.date.toLocaleDateString()}</TableCell>
                <TableCell>{workout.client.name}</TableCell>
                <TableCell>{workout.trainer?.name || "-"}</TableCell>
                <TableCell>{workout.sets.length}</TableCell>
                <TableCell>
                  {workout.sets.reduce((acc, set) => acc + set.exercises.length, 0)}
                </TableCell>
                <TableCell>{workout.status}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}