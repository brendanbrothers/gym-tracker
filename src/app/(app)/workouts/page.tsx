import { getServerSession } from "next-auth"
import Link from "next/link"
import { authOptions, isTrainer as checkTrainer } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { formatWorkoutDateTime } from "@/lib/utils"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { NewWorkoutForm } from "./new-workout-form"
import { StatusBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"

const PAGE_SIZE = 20

export default async function WorkoutsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const session = await getServerSession(authOptions)

  const isTrainer = checkTrainer(session?.user.role)
  const where = isTrainer ? {} : { clientId: session?.user.id }

  const totalCount = await prisma.workoutSession.count({ where })
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
  const requestedPage = Number((await searchParams).page) || 1
  const page = Math.min(Math.max(1, requestedPage), totalPages)

  const workouts = await prisma.workoutSession.findMany({
    where,
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
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  })

  const firstRow = totalCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const lastRow = (page - 1) * PAGE_SIZE + workouts.length

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
              <TableRow key={workout.id} className="cursor-pointer hover:bg-muted/50">
                <TableCell>
                  <Link href={`/workouts/${workout.id}`} className="block">
                    {formatWorkoutDateTime(workout.date)}
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
      )}
      {totalCount > PAGE_SIZE && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-muted-foreground">
            Showing {firstRow}–{lastRow} of {totalCount}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              asChild={page > 1}
            >
              {page > 1 ? (
                <Link href={`/workouts?page=${page - 1}`}>Previous</Link>
              ) : (
                <span>Previous</span>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              asChild={page < totalPages}
            >
              {page < totalPages ? (
                <Link href={`/workouts?page=${page + 1}`}>Next</Link>
              ) : (
                <span>Next</span>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}