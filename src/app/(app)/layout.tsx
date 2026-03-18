import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { BottomNav } from "@/components/bottom-nav"
import { EnvironmentBanner } from "@/components/environment-banner"

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col min-h-screen">
      <EnvironmentBanner />
      <SidebarProvider>
        <AppSidebar />
        <main className="flex-1 pb-16 md:pb-0">
          <div className="hidden md:block">
            <SidebarTrigger className="p-4" />
          </div>
          {children}
        </main>
        <BottomNav />
      </SidebarProvider>
    </div>
  )
}