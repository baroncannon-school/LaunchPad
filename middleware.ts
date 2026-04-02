import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Role prefix mapping
const ROLE_DASHBOARDS: Record<string, string> = {
  INSTRUCTOR: "/instructor/dashboard",
  STUDENT: "/student/dashboard",
  MENTOR: "/mentor/dashboard",
};

const ROLE_PREFIXES: Record<string, string> = {
  INSTRUCTOR: "/instructor",
  STUDENT: "/student",
  MENTOR: "/mentor",
};

// Routes that don't require authentication
const PUBLIC_ROUTES = ["/login", "/auth/callback"];

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    return supabaseResponse;
  }

  // No auth session → redirect to login
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Look up user role from our custom claim or DB
  // For now, we'll pass through and let server components handle role checks.
  // The role is checked in the (authenticated) layout and page-level requireRole() calls.
  //
  // Root path → redirect to appropriate dashboard
  if (pathname === "/") {
    // We can't easily query Prisma in middleware (edge runtime),
    // so we redirect to a role-resolver route that runs on Node
    const url = request.nextUrl.clone();
    url.pathname = "/auth/resolve-role";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    // Match all routes except static files and API routes we want public
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
