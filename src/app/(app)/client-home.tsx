import Link from "next/link"
import { ClipboardList, Calendar, Ban } from "lucide-react"
import { StatusBadge } from "@/components/status-badge"
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

type ClientHomeProps = {
  userId: string
  userName: string
}

export async function ClientHome({ userId, userName }: ClientHomeProps) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Upcoming workouts (scheduled or in progress, date >= today)
  const upcomingWorkouts = await prisma.workoutSession.findMany({
    where: {
      clientId: userId,
      status: { in: ["SCHEDULED", "IN_PROGRESS"] },
      date: { gte: today },
    },
    include: {
      trainer: true,
      sets: {
        include: {
          exercises: true,
        },
      },
    },
    orderBy: { date: "asc" },
    take: 10,
  })

  // Past workouts (completed, or past-due and not cancelled)
  const pastWorkouts = await prisma.workoutSession.findMany({
    where: {
      clientId: userId,
      status: { not: "CANCELLED" },
      OR: [
        { status: "COMPLETED" },
        { date: { lt: today } },
      ],
    },
    include: {
      trainer: true,
      sets: {
        include: {
          exercises: true,
        },
      },
    },
    orderBy: { date: "desc" },
    take: 10,
  })

  // Cancelled workouts, so clients can keep track of them
  const cancelledWorkouts = await prisma.workoutSession.findMany({
    where: {
      clientId: userId,
      status: "CANCELLED",
    },
    include: {
      trainer: true,
      sets: {
        include: {
          exercises: true,
        },
      },
    },
    orderBy: { date: "desc" },
    take: 10,
  })

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Welcome, {userName}</h1>
        <p className="text-muted-foreground">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      {/* Upcoming Workouts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Upcoming Workouts
          </CardTitle>
          <CardDescription>
            {upcomingWorkouts.length === 0
              ? "No upcoming workouts scheduled"
              : `${upcomingWorkouts.length} workout${upcomingWorkouts.length > 1 ? "s" : ""} scheduled`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {upcomingWorkouts.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Trainer</TableHead>
                  <TableHead>Exercises</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {upcomingWorkouts.map((workout) => (
                  <TableRow key={workout.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell>
                      <Link href={`/workouts/${workout.id}`} className="block font-medium">
                        {workout.date.toLocaleString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link href={`/workouts/${workout.id}`} className="block">
                        {workout.trainer?.name || "-"}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link href={`/workouts/${workout.id}`} className="block">
                        {workout.sets.reduce((acc, set) => acc + set.exercises.length, 0)}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link href={`/workouts/${workout.id}`} className="block">
                        <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800">
                          IN PROGRESS
                        </span>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              No upcoming workouts. Check back soon!
            </p>
          )}
        </CardContent>
      </Card>

      {/* Past Workouts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Past Workouts
          </CardTitle>
          <CardDescription>
            {pastWorkouts.length === 0
              ? "No completed workouts yet"
              : `${pastWorkouts.length} completed workout${pastWorkouts.length > 1 ? "s" : ""}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pastWorkouts.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Trainer</TableHead>
                  <TableHead>Exercises</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pastWorkouts.map((workout) => (
                  <TableRow key={workout.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell>
                      <Link href={`/workouts/${workout.id}`} className="block font-medium">
                        {workout.date.toLocaleString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link href={`/workouts/${workout.id}`} className="block">
                        {workout.trainer?.name || "-"}
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
          ) : (
            <p className="text-muted-foreground text-center py-8">
              No past workouts yet. Complete your first workout to see it here!
            </p>
          )}
        </CardContent>
      </Card>

      {/* Cancelled Workouts */}
      {cancelledWorkouts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ban className="h-5 w-5" />
              Cancelled Workouts
            </CardTitle>
            <CardDescription>
              {`${cancelledWorkouts.length} cancelled workout${cancelledWorkouts.length > 1 ? "s" : ""}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Trainer</TableHead>
                  <TableHead>Exercises</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cancelledWorkouts.map((workout) => (
                  <TableRow key={workout.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell>
                      <Link href={`/workouts/${workout.id}`} className="block font-medium">
                        {workout.date.toLocaleString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link href={`/workouts/${workout.id}`} className="block">
                        {workout.trainer?.name || "-"}
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
          </CardContent>
        </Card>
      )}
    </div>
  )
}
