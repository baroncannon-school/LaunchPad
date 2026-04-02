// Role resolver — redirects to the correct dashboard
// Used when middleware can't query the DB (edge runtime)

import { getCurrentUser } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  const origin = new URL(request.url).origin;

  if (!user) {
    return NextResponse.redirect(`${origin}/login`);
  }

  const dashboards: Record<string, string> = {
    INSTRUCTOR: "/instructor/dashboard",
    STUDENT: "/student/dashboard",
    MENTOR: "/mentor/dashboard",
  };

  return NextResponse.redirect(`${origin}${dashboards[user.role]}`);
}
