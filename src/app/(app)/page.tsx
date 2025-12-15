import { getServerSession } from "next-auth"
import Link from "next/link"
import { Dumbbell, Users, ClipboardList } from "lucide-react"

import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { HomeActions } from "./home-actions"

export default async function Home() {
  const session = await getServerSession(authOptions)
  const isTrainer = session?.user.role === "TRAINER" || session?.user.role === "ADMIN"

  // Get today's date range
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  // Get today's workouts
  const todaysWorkouts = await prisma.workoutSession.findMany({
    where: isTrainer
      ? {
          date: {
            gte: today,
            lt: tomorrow,
          },
        }
      : {
          clientId: session?.user.id,
          date: {
            gte: today,
            lt: tomorrow,
          },
        },
    include: {
      client: true,
      trainer: true,
      sets: {
        orderBy: { order: "asc" },
        include: {
          exercises: {
            orderBy: [{ order: "asc" }, { round: "asc" }],
          },
        },
      },
    },
    orderBy: { date: "desc" },
  })

  // Get data needed for forms
  const clients = await prisma.user.findMany({
    where: { role: "CLIENT" },
    orderBy: { name: "asc" },
  })

  const trainers = await prisma.user.findMany({
    where: { role: { in: ["TRAINER", "ADMIN"] } },
    orderBy: { name: "asc" },
  })

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Welcome, {session?.user.name}</h1>
        <p className="text-muted-foreground">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <HomeActions clients={clients} trainers={trainers} isTrainer={isTrainer} />
      </div>

      {/* Today's Workouts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Today&apos;s Workouts
          </CardTitle>
          <CardDescription>
            {todaysWorkouts.length === 0
              ? "No workouts scheduled for today"
              : `${todaysWorkouts.length} workout${todaysWorkouts.length > 1 ? "s" : ""} today`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {todaysWorkouts.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Trainer</TableHead>
                  <TableHead>Sets</TableHead>
                  <TableHead>Exercises</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {todaysWorkouts.map((workout) => (
                  <TableRow key={workout.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell>
                      <Link href={`/workouts/${workout.id}`} className="block font-medium">
                        {workout.client.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link href={`/workouts/${workout.id}`} className="block">
                        {workout.trainer?.name || "-"}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link href={`/workouts/${workout.id}`} className="block">
                        {workout.sets.length}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link href={`/workouts/${workout.id}`} className="block">
                        {workout.sets.reduce((acc, set) => acc + set.exercises.length, 0)}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link href={`/workouts/${workout.id}`} className="block">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                            workout.status === "COMPLETED"
                              ? "bg-green-100 text-green-800"
                              : workout.status === "IN_PROGRESS"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {workout.status.replace("_", " ")}
                        </span>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              No workouts scheduled for today. Create one to get started!
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
