import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { DEMO_COOKIE } from "@/lib/demo";

export async function middleware(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  let response = NextResponse.next({ request });

  const path = request.nextUrl.pathname;
  const isApp = path.startsWith("/app");
  const isAuth =
    path.startsWith("/masuk") ||
    path.startsWith("/daftar") ||
    path.startsWith("/reset");
  const demo = request.cookies.get(DEMO_COOKIE)?.value === "1";

  if (!url || !key) {
    if (isApp && !demo) {
      const next = request.nextUrl.clone();
      next.pathname = "/masuk";
      return NextResponse.redirect(next);
    }
    if (isAuth && demo && !path.startsWith("/reset")) {
      const next = request.nextUrl.clone();
      next.pathname = "/app";
      return NextResponse.redirect(next);
    }
    return response;
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (isApp && !user && !demo) {
    const next = request.nextUrl.clone();
    next.pathname = "/masuk";
    return NextResponse.redirect(next);
  }
  if (isAuth && (user || demo) && !path.startsWith("/reset")) {
    const next = request.nextUrl.clone();
    next.pathname = "/app";
    return NextResponse.redirect(next);
  }
  return response;
}

export const config = {
  matcher: ["/app/:path*", "/masuk", "/daftar", "/reset", "/undang/:path*"],
};
