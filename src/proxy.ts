import { getToken } from "next-auth/jwt"
import { NextRequest, NextResponse } from "next/server"

export async function proxy(request: NextRequest) {
  const token = await getToken({ req: request })

  if (!token) {
    const loginUrl = new URL("/login", request.url)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!login|api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
}