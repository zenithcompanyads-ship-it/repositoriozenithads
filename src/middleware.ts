import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const ROLE_COOKIE = 'zen-role';
const ROLE_TTL = 60 * 30; // 30 minutes

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Helper: lookup role with cookie cache
  const getRole = async (userId: string): Promise<string | undefined> => {
    const cached = request.cookies.get(ROLE_COOKIE)?.value;
    if (cached) return cached;

    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    const role = userData?.role;
    if (role) {
      supabaseResponse.cookies.set(ROLE_COOKIE, role, {
        httpOnly: true,
        sameSite: 'lax',
        maxAge: ROLE_TTL,
        path: '/',
      });
    }
    return role;
  };

  // Rotas públicas — sem auth
  if (
    pathname === '/login' ||
    pathname === '/' ||
    pathname.startsWith('/share/')
  ) {
    if (user && (pathname === '/login' || pathname === '/')) {
      const role = await getRole(user.id);
      if (role === 'admin') {
        return NextResponse.redirect(new URL('/admin/dashboard', request.url));
      } else {
        return NextResponse.redirect(new URL('/client/dashboard', request.url));
      }
    }
    return supabaseResponse;
  }

  // Rotas protegidas — exige auth
  if (!user) {
    // Limpa cookie de role ao deslogar
    supabaseResponse.cookies.delete(ROLE_COOKIE);
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const role = await getRole(user.id);

  if (pathname.startsWith('/admin') && role !== 'admin') {
    return NextResponse.redirect(new URL('/client/dashboard', request.url));
  }

  if (pathname.startsWith('/client') && role !== 'client') {
    return NextResponse.redirect(new URL('/admin/dashboard', request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/cron|.*\\.(?:svg|png|jpg|jpeg|gif|webp|html)$).*)',
  ],
};
