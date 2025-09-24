import { auth } from "@/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const { pathname } = req.nextUrl

  // Create response
  let response: NextResponse

  // Allow auth routes and static files
  if (pathname.startsWith('/auth') ||
      pathname.startsWith('/_next') ||
      pathname.startsWith('/api/auth') ||
      pathname === '/favicon.ico') {
    response = NextResponse.next()
  } else if (!req.auth) {
    // Redirect unauthenticated users to signin
    const signInUrl = new URL('/auth/signin', req.url)
    response = NextResponse.redirect(signInUrl)
  } else {
    response = NextResponse.next()
  }

  // Essential security headers
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('X-XSS-Protection', '1; mode=block')

  return response
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}