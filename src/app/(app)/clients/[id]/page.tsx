import { notFound, redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { authOptions, isTrainer as checkTrainer } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { formatWorkoutDateTime } from "@/lib/utils"
import { StatusBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const PAGE_SIZE = 20

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params

  const client = await prisma.user.findUnique({
    where: { id },
    select: { name: true },
  })

  if (!client) {
    return { title: "Client | Gym Tracker" }
  }

  return { title: `${client.name} | Gym Tracker` }
}

export default async function ClientPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ page?: string }>
}) {
  const { id } = await params
  const session = await getServerSession(authOptions)

  const isTrainer = checkTrainer(session?.user.role)
  const isSelf = session?.user.id === id

  // Access control: trainers can see any client; clients can see only their own.
  if (!isTrainer && !isSelf) {
    redirect("/")
  }

  const client = await prisma.user.findUnique({ where: { id } })

  if (!client || client.role !== "CLIENT") {
    notFound()
  }

  const where = { clientId: id }
  const totalCount = await prisma.workoutSession.count({ where })
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
  const requestedPage = Number((await searchParams).page) || 1
  const page = Math.min(Math.max(1, requestedPage), totalPages)

  const workouts = await prisma.workoutSession.findMany({
    where,
    include: {
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

  return (
    <div className="p-6">
      {isTrainer && (
        <Link
          href="/clients"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Clients
        </Link>
      )}

      <div className="mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">{client.name}</h1>
          {client.status === "FORMER" && (
            <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800">
              Former
            </span>
          )}
        </div>
        <p className="text-muted-foreground">{client.email}</p>
      </div>

      <h2 className="text-lg font-semibold mb-3">Workouts</h2>
      {workouts.length === 0 ? (
        <p className="text-muted-foreground">No workouts yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Trainer</TableHead>
              <TableHead>Circuits</TableHead>
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
                <Link href={`/clients/${id}?page=${page - 1}`}>Previous</Link>
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
                <Link href={`/clients/${id}?page=${page + 1}`}>Next</Link>
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
