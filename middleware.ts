import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PROTECTED = [
  '/dashboard',
  '/jobs',
  '/candidates',
  '/pipeline',
  '/automations',
  '/outreach',
  '/analytics',
  '/integrations',
  '/settings',
]

const AUTH_ROUTES = ['/login', '/register']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get('access_token')?.value

  const isProtected = PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  const isAuthRoute = AUTH_ROUTES.some((p) => pathname.startsWith(p))

  if (!token && isProtected) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  if (token && isAuthRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    url.search = ''
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|apply|favicon.ico).*)'],
}
