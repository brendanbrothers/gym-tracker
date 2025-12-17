"use client"

import { ClipboardList, Dumbbell, Home, TrendingUp, Users } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import { cn } from "@/lib/utils"

function getMenuItems(role: string | undefined) {
  const isTrainer = role === "TRAINER" || role === "ADMIN"

  if (isTrainer) {
    // Trainer mobile nav - limit to 5 most important items
    return [
      { title: "Home", href: "/", icon: Home },
      { title: "Workouts", href: "/workouts", icon: ClipboardList },
      { title: "Clients", href: "/clients", icon: Users },
      { title: "Progress", href: "/progress", icon: TrendingUp },
      { title: "Exercises", href: "/exercises", icon: Dumbbell },
    ]
  }

  return [
    { title: "Home", href: "/", icon: Home },
    { title: "Workouts", href: "/workouts", icon: ClipboardList },
    { title: "Progress", href: "/progress", icon: TrendingUp },
    { title: "Exercises", href: "/exercises", icon: Dumbbell },
  ]
}

export function BottomNav() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const menuItems = getMenuItems(session?.user?.role)

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t md:hidden">
      <div className="flex justify-around items-center h-16">
        {menuItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full px-2 py-1",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-xs mt-1">{item.title}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}