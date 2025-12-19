import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
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
import { UserForm } from "../users/user-form"

export default async function TrainersPage() {
  const session = await getServerSession(authOptions)
  const isTrainer = session?.user.role === "TRAINER" || session?.user.role === "GYM_ADMIN" || session?.user.role === "ADMIN"

  if (!isTrainer) {
    redirect("/")
  }

  const trainers = await prisma.user.findMany({
    where: { role: { in: ["TRAINER", "GYM_ADMIN", "ADMIN"] } },
    orderBy: { name: "asc" },
  })

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Trainers</h1>
        <UserForm defaultRole="TRAINER" />
      </div>
      {trainers.length === 0 ? (
        <p className="text-muted-foreground">No trainers yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {trainers.map((trainer) => (
              <TableRow key={trainer.id}>
                <TableCell className="font-medium">{trainer.name}</TableCell>
                <TableCell>{trainer.email}</TableCell>
                <TableCell>{trainer.role}</TableCell>
                <TableCell>{trainer.createdAt.toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
