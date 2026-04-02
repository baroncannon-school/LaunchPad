// Auth callback handler
// After Google OAuth or magic link, Supabase redirects here with a code.
// We exchange the code for a session, then look up (or create) the user in our DB.

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // Check if user exists in our app database
      let dbUser = await prisma.user.findUnique({
        where: { supabaseUid: data.user.id },
      });

      if (!dbUser) {
        // First-time login: create the user record
        // Determine role based on email domain or pre-registration
        const email = data.user.email ?? "";
        const metadata = data.user.user_metadata;

        // Check if this email was pre-registered as a mentor
        const preMentor = await prisma.user.findUnique({
          where: { email },
        });

        if (preMentor && !preMentor.supabaseUid) {
          // Pre-registered user (mentor invited by instructor) — link accounts
          dbUser = await prisma.user.update({
            where: { email },
            data: {
              supabaseUid: data.user.id,
              avatarUrl: metadata?.avatar_url ?? null,
            },
          });
        } else if (!preMentor) {
          // Brand new user — determine role
          // Instructor email check (update this to your actual email)
          const isInstructor = email === "bcannon@sfhs.com"; // TODO: Update to your SFHS email

          // SFHS domain check for students
          const isSFHSEmail = email.endsWith("@sfhs.com"); // TODO: Update domain

          const role = isInstructor
            ? "INSTRUCTOR"
            : isSFHSEmail
              ? "STUDENT"
              : "MENTOR";

          const fullName = metadata?.full_name ?? metadata?.name ?? email.split("@")[0];
          const nameParts = fullName.split(" ");
          const firstName = nameParts[0] ?? "";
          const lastName = nameParts.slice(1).join(" ") ?? "";

          dbUser = await prisma.user.create({
            data: {
              email,
              name: fullName,
              firstName,
              lastName,
              role,
              supabaseUid: data.user.id,
              avatarUrl: metadata?.avatar_url ?? null,
            },
          });
        }
      }

      // Redirect to appropriate dashboard based on role
      if (dbUser) {
        const dashboards: Record<string, string> = {
          INSTRUCTOR: "/instructor/dashboard",
          STUDENT: "/student/dashboard",
          MENTOR: "/mentor/dashboard",
        };
        return NextResponse.redirect(
          `${origin}${dashboards[dbUser.role] ?? next}`
        );
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Auth failed — redirect to login with error
  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
