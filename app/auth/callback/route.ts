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
              let dbUser = await prisma.user.findUnique({
                        where: { supabaseUid: data.user.id },
              });

          if (!dbUser) {
                    const email = data.user.email ?? "";
                    const metadata = data.user.user_metadata;

                const preMentor = await prisma.user.findUnique({
                            where: { email },
                });

                if (preMentor && !preMentor.supabaseUid) {
                            dbUser = await prisma.user.update({
                                          where: { email },
                                          data: {
                                                          supabaseUid: data.user.id,
                                                          avatarUrl: metadata?.avatar_url ?? null,
                                          },
                            });
                } else if (!preMentor) {
                            // Instructor emails — add additional instructors here as needed
                      const INSTRUCTOR_EMAILS = ["baroncannon@sfhs.com"];
                            const isInstructor = INSTRUCTOR_EMAILS.includes(email);
                            const isSFHSEmail = email.endsWith("@sfhs.com");

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

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
