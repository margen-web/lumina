import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // refreshes the auth token
  const { data: { user } } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname;
  
  // Basic protection: if accessing /dashboard, ensure there is a session
  if (pathname.startsWith('/dashboard') && pathname !== '/dashboard/login') {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard/login'
      const redirectResponse = NextResponse.redirect(url)
      // Copy cookies to redirect response exactly as Set-Cookie headers
      supabaseResponse.headers.forEach((value, key) => {
        if (key.toLowerCase() === 'set-cookie') {
          redirectResponse.headers.append('set-cookie', value)
        }
      })
      return redirectResponse
    }
  }

  // Prevent accessing login if already authenticated
  if (pathname === '/dashboard/login' && user) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    const redirectResponse = NextResponse.redirect(url)
    // Copy cookies to redirect response exactly as Set-Cookie headers
    supabaseResponse.headers.forEach((value, key) => {
      if (key.toLowerCase() === 'set-cookie') {
        redirectResponse.headers.append('set-cookie', value)
      }
    })
    return redirectResponse
  }

  return supabaseResponse
}
