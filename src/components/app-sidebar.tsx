"use client"

import { useEffect, useState } from "react"
import { ClipboardList, Dumbbell, Home, LogOut, TrendingUp, Users, UserCheck, Building2 } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut, useSession } from "next-auth/react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { getGymBranding } from "@/app/(app)/gym/actions"

function getMenuItems(role: string | undefined) {
  const isTrainer = role === "TRAINER" || role === "GYM_ADMIN" || role === "ADMIN"
  const canManageGym = role === "GYM_ADMIN" || role === "ADMIN"

  if (isTrainer) {
    const items = [
      { title: "Home", href: "/", icon: Home },
      { title: "Workouts", href: "/workouts", icon: ClipboardList },
      { title: "Clients", href: "/clients", icon: Users },
      { title: "Trainers", href: "/trainers", icon: UserCheck },
      { title: "Progress", href: "/progress", icon: TrendingUp },
      { title: "Exercises", href: "/exercises", icon: Dumbbell },
    ]

    if (canManageGym) {
      items.push({ title: "Gym Settings", href: "/gym/settings", icon: Building2 })
    }

    return items
  }

  return [
    { title: "Home", href: "/", icon: Home },
    { title: "My Workouts", href: "/workouts", icon: ClipboardList },
    { title: "Progress", href: "/progress", icon: TrendingUp },
    { title: "Exercises", href: "/exercises", icon: Dumbbell },
  ]
}

export function AppSidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const menuItems = getMenuItems(session?.user?.role)
  const [gymLogo, setGymLogo] = useState<string | null>(null)
  const [gymName, setGymName] = useState<string | null>(session?.user?.gymName ?? null)

  useEffect(() => {
    if (session?.user?.gymId) {
      getGymBranding().then((gym) => {
        if (gym) {
          setGymLogo(gym.logo)
          setGymName(gym.name)
        }
      })
    }
  }, [session?.user?.gymId])

  return (
    <Sidebar className="hidden md:flex">
      <SidebarHeader className="p-4">
        {gymLogo ? (
          <img
            src={gymLogo}
            alt={`${gymName} logo`}
            className="max-h-12 w-auto object-contain"
          />
        ) : (
          <h1 className="text-xl font-bold truncate">{gymName || "GymTracker"}</h1>
        )}
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={pathname === item.href}>
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4">
        {session?.user && (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-muted-foreground truncate">
              {session.user.name}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </Button>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  )
}