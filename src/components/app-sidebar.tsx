"use client"

import { ClipboardList, Dumbbell, LogOut, TrendingUp, Users } from "lucide-react"
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

const menuItems = [
  {
    title: "Workouts",
    href: "/workouts",
    icon: ClipboardList,
  },
  {
    title: "Progress",
    href: "/progress",
    icon: TrendingUp,
  },
  {
    title: "Users",
    href: "/users",
    icon: Users,
  },
  {
    title: "Exercises",
    href: "/exercises",
    icon: Dumbbell,
  },
]

export function AppSidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()

  return (
    <Sidebar className="hidden md:flex">
      <SidebarHeader className="p-4">
        <h1 className="text-xl font-bold">GymTracker</h1>
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