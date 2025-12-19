import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { GymSettingsForm } from "./gym-settings-form"

export default async function GymSettingsPage() {
  const session = await getServerSession(authOptions)

  const canManageGym = session?.user.role === "GYM_ADMIN" || session?.user.role === "ADMIN"
  const isTrainerOrAbove = session?.user.role === "TRAINER" || session?.user.role === "GYM_ADMIN" || session?.user.role === "ADMIN"

  if (!isTrainerOrAbove) {
    redirect("/")
  }

  const gymId = session?.user.gymId
  if (!gymId) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Gym Settings</h1>
        <p className="text-muted-foreground">No gym associated with your account.</p>
      </div>
    )
  }

  const gym = await prisma.gym.findUnique({
    where: { id: gymId },
    include: {
      users: {
        where: { role: "TRAINER" },
        select: { id: true, name: true, email: true },
        orderBy: { name: "asc" },
      },
    },
  })

  if (!gym) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Gym Settings</h1>
        <p className="text-muted-foreground">Gym not found.</p>
      </div>
    )
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Gym Settings</h1>

      <div className="max-w-2xl space-y-8">
        <GymSettingsForm gym={gym} canEdit={canManageGym} />

        <div>
          <h2 className="text-lg font-semibold mb-4">Trainers</h2>
          {gym.users.length === 0 ? (
            <p className="text-muted-foreground">No trainers in this gym yet.</p>
          ) : (
            <ul className="space-y-2">
              {gym.users.map((trainer) => (
                <li key={trainer.id} className="flex items-center gap-2 p-3 rounded-lg border">
                  <div>
                    <p className="font-medium">{trainer.name}</p>
                    <p className="text-sm text-muted-foreground">{trainer.email}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
