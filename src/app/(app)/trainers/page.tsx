import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { UserForm } from "../users/user-form"
import { UserList } from "../users/user-list"
import { ShowFormerToggle } from "../clients/show-former-toggle"

export default async function TrainersPage({
  searchParams,
}: {
  searchParams: Promise<{ showFormer?: string }>
}) {
  const session = await getServerSession(authOptions)
  const isTrainer = session?.user.role === "TRAINER" || session?.user.role === "GYM_ADMIN" || session?.user.role === "ADMIN"

  if (!isTrainer) {
    redirect("/")
  }

  const { showFormer } = await searchParams
  const showFormerUsers = showFormer === "true"

  const trainers = await prisma.user.findMany({
    where: { role: { in: ["TRAINER", "GYM_ADMIN", "ADMIN"] } },
    orderBy: [{ status: "asc" }, { name: "asc" }],
  })

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Trainers</h1>
        <div className="flex items-center gap-4">
          <ShowFormerToggle showFormer={showFormerUsers} />
          <UserForm defaultRole="TRAINER" />
        </div>
      </div>
      <UserList users={trainers} showFormer={showFormerUsers} userType="trainer" />
    </div>
  )
}
