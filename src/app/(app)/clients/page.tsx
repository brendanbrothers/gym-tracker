import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { UserForm } from "../users/user-form"
import { UserList } from "../users/user-list"
import { ShowFormerToggle } from "./show-former-toggle"

export default async function ClientsPage({
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

  const clients = await prisma.user.findMany({
    where: { role: "CLIENT" },
    orderBy: [{ status: "asc" }, { name: "asc" }],
  })

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Clients</h1>
        <div className="flex items-center gap-4">
          <ShowFormerToggle showFormer={showFormerUsers} />
          <UserForm defaultRole="CLIENT" />
        </div>
      </div>
      <UserList users={clients} showFormer={showFormerUsers} userType="client" />
    </div>
  )
}
