import { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: string
      gymId: string | null
      gymSlug: string | null
      gymName: string | null
    } & DefaultSession["user"]
  }

  interface User {
    role: string
    gymId: string | null
    gymSlug: string | null
    gymName: string | null
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string
    gymId?: string | null
    gymSlug?: string | null
    gymName?: string | null
  }
}