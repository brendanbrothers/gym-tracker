import { getServerSession } from "next-auth"
import Link from "next/link"
import { ClipboardList } from "lucide-react"

import { authOptions, isTrainer as checkTrainer } from "@/lib/auth"
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
import { ClientHome } from "./client-home"
import { StatusBadge } from "@/components/status-badge"
import { APP_TIME_ZONE, appTzDayRange, formatWorkoutTime } from "@/lib/utils"

type WorkoutRow = {
  id: string
  date: Date
  status: string
  client: { name: string }
  trainer: { name: string } | null
  sets: { exercises: unknown[] }[]
}

function TodaysWorkoutsTable({ workouts }: { workouts: WorkoutRow[] }) {
  return (
    <Table className="table-fixed">
      <TableHeader>
        <TableRow>
          <TableHead className="w-28">Time</TableHead>
          <TableHead>Client</TableHead>
          <TableHead>Trainer</TableHead>
          <TableHead className="w-20">Circuits</TableHead>
          <TableHead className="w-24">Exercises</TableHead>
          <TableHead className="w-32">Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {workouts.map((workout) => (
          <TableRow key={workout.id} className="cursor-pointer hover:bg-muted/50">
            <TableCell>
              <Link href={`/workouts/${workout.id}`} className="block font-medium">
                {formatWorkoutTime(workout.date)}
              </Link>
            </TableCell>
            <TableCell>
              <Link href={`/workouts/${workout.id}`} className="block">
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
                <StatusBadge status={workout.status} />
              </Link>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export default async function Home() {
  const session = await getServerSession(authOptions)
  const isTrainer = checkTrainer(session?.user.role)

  // Show client home for non-trainers
  if (!isTrainer && session?.user) {
    return <ClientHome userId={session.user.id} userName={session.user.name || "User"} />
  }

  // Today's date range, in the gym's timezone (not the server's UTC day).
  const { start: today, end: tomorrow } = appTzDayRange()

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
    orderBy: { date: "asc" },
  })

  // Scheduled + in-progress share the tile; sorted by time, the active ones
  // naturally surface near the top of the day's agenda.
  const activeWorkouts = todaysWorkouts.filter(
    (w) => w.status === "SCHEDULED" || w.status === "IN_PROGRESS"
  )
  const completedWorkouts = todaysWorkouts.filter(
    (w) => w.status === "COMPLETED"
  )

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
            timeZone: APP_TIME_ZONE,
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

      {/* Today's Workouts (in progress) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Today&apos;s Workouts
          </CardTitle>
          <CardDescription>
            {activeWorkouts.length === 0
              ? "No workouts scheduled for today"
              : `${activeWorkouts.length} workout${activeWorkouts.length > 1 ? "s" : ""} scheduled or in progress`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activeWorkouts.length > 0 ? (
            <TodaysWorkoutsTable workouts={activeWorkouts} />
          ) : (
            <p className="text-muted-foreground text-center py-8">
              No workouts scheduled for today. Create one to get started!
            </p>
          )}
        </CardContent>
      </Card>

      {/* Completed Today */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Completed Today
          </CardTitle>
          <CardDescription>
            {completedWorkouts.length === 0
              ? "No completed workouts today"
              : `${completedWorkouts.length} workout${completedWorkouts.length > 1 ? "s" : ""} completed`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {completedWorkouts.length > 0 ? (
            <TodaysWorkoutsTable workouts={completedWorkouts} />
          ) : (
            <p className="text-muted-foreground text-center py-8">
              No workouts completed yet today.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
