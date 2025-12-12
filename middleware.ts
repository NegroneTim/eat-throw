import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

export async function middleware(request: NextRequest) {
  const response = NextResponse.next()
  const pathname = request.nextUrl.pathname

  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-requested-with')

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: response.headers
    })
  }

  if (pathname === '/api/cron-job') return response

  if (pathname.startsWith('/api/')) {
    const isPublicRoute =
      pathname === '/api/score' ||
      (pathname === '/api/users' && request.method === 'POST') ||
      (pathname.startsWith('/api/users/uid/') && request.method === 'GET') ||
      (pathname === '/api/prize' && request.method === 'GET') ||
      pathname === '/api/cron-job';

    if (!isPublicRoute) {
      try {
        const authHeader = request.headers.get('authorization')

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return NextResponse.json({ error: "Authentication required" }, { status: 401 })
        }

        const token = authHeader.replace('Bearer ', '')
        const secret = new TextEncoder().encode(process.env.NEXT_PUBLIC_JWT_SECRET || 'default-secret')

        await jwtVerify(token, secret)

      } catch (error) {
        console.error('JWT verification error:', error)
        return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 })
      }
    }
  }

  return response
}

export const config = {
  matcher: [
    '/api/:path*',
  ]
}