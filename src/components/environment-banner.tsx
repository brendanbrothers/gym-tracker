import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function EnvironmentBanner() {
  const session = await getServerSession(authOptions)

  // Only show for ADMIN users
  if (session?.user?.role !== "ADMIN") {
    return null
  }

  // Detect platform: Vercel sets VERCEL env var automatically
  const isVercel = !!process.env.VERCEL
  const platform = isVercel ? "Vercel" : "Local"

  // Detect database environment
  // Can be set explicitly via DATABASE_ENV, or detected from DATABASE_URL
  let dbEnv = process.env.DATABASE_ENV
  if (!dbEnv) {
    const dbUrl = process.env.DATABASE_URL || ""
    // Detection based on Neon database naming pattern
    if (dbUrl.includes("ep-green-bar")) {
      dbEnv = "Production"
    } else if (dbUrl.includes("ep-steep-hall")) {
      dbEnv = "Development"
    } else {
      dbEnv = "Unknown"
    }
  }

  // Color coding based on environment
  const isProduction = dbEnv.toLowerCase() === "production"
  const bgColor = isProduction
    ? "bg-red-600"
    : "bg-amber-500"
  const textColor = isProduction
    ? "text-white"
    : "text-black"

  return (
    <div className={`${bgColor} ${textColor} text-center text-xs py-1 font-medium`}>
      {platform} - {dbEnv}
    </div>
  )
}
