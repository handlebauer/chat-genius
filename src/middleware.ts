import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  const {
    data: { session },
  } = await supabase.auth.getSession()

  // If no session and trying to access protected routes
  if (!session && req.nextUrl.pathname.startsWith('/chat')) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // If session exists and trying to access auth pages
  if (session && (req.nextUrl.pathname === '/login' || req.nextUrl.pathname === '/register')) {
    return NextResponse.redirect(new URL('/chat', req.url))
  }

  return res
}

export const config = {
  matcher: ['/chat/:path*', '/login', '/register']
}
