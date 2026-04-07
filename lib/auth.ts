// Auth helper: fetches the current user's app-level profile (with role)
// Used in server components and API routes after Supabase auth is confirmed

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import type { UserRole } from "@prisma/client";

/** Cookie name used for instructor → student impersonation */
export const IMPERSONATE_COOKIE = "lp_impersonate";

export interface AppUser {
  id: string;
  email: string;
  name: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  avatarUrl: string | null;
  supabaseUid: string;
}

/**
 * Get the current authenticated user's app profile.
 * Returns null if not authenticated or user doesn't exist in our DB.
 */
export async function getCurrentUser(): Promise<AppUser | null> {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return null;

  const dbUser = await prisma.user.findUnique({
    where: { supabaseUid: authUser.id },
  });

  if (!dbUser) return null;

  return {
    id: dbUser.id,
    email: dbUser.email,
    name: dbUser.name,
    firstName: dbUser.firstName,
    lastName: dbUser.lastName,
    role: dbUser.role,
    avatarUrl: dbUser.avatarUrl,
    supabaseUid: dbUser.supabaseUid!,
  };
}

/**
 * Require authentication — throws redirect if not logged in.
 * Use in server components / page.tsx files.
 */
export async function requireAuth(): Promise<AppUser> {
  const user = await getCurrentUser();
  if (!user) {
    // This will be caught by Next.js and trigger a redirect
    const { redirect } = await import("next/navigation");
    redirect("/login");
  }
  return user;
}

/**
 * Require a specific role — throws redirect if wrong role.
 * When allowImpersonation is true, instructors can access student routes
 * if an impersonation cookie is active.
 */
export async function requireRole(
  role: UserRole,
  opts?: { allowImpersonation?: boolean }
): Promise<AppUser> {
  const user = await requireAuth();

  // Allow instructor to access student routes while impersonating
  if (
    opts?.allowImpersonation &&
    role === "STUDENT" &&
    user.role === "INSTRUCTOR"
  ) {
    const cookieStore = await cookies();
    const impersonateId = cookieStore.get(IMPERSONATE_COOKIE)?.value;
    if (impersonateId) {
      // Instructor is impersonating — allow access (the actual user swap
      // happens via getEffectiveUser)
      return user;
    }
  }

  if (user.role !== role) {
    const { redirect } = await import("next/navigation");
    const ROLE_ROUTES: Record<UserRole, string> = {
      INSTRUCTOR: "/instructor/dashboard",
      STUDENT: "/student/dashboard",
      MENTOR: "/mentor/dashboard",
    };
    redirect(ROLE_ROUTES[user.role]);
  }
  return user;
}

/**
 * Get the "effective" user — the student being viewed during impersonation,
 * or the real user when not impersonating.
 * Only returns a different user if the real user is an INSTRUCTOR with
 * a valid impersonation cookie.
 */
export async function getEffectiveUser(): Promise<{
  user: AppUser;
  isImpersonating: boolean;
  realUser: AppUser;
}> {
  const realUser = await requireAuth();

  if (realUser.role === "INSTRUCTOR") {
    const cookieStore = await cookies();
    const impersonateId = cookieStore.get(IMPERSONATE_COOKIE)?.value;

    if (impersonateId) {
      const targetStudent = await prisma.user.findUnique({
        where: { id: impersonateId, role: "STUDENT" },
      });

      if (targetStudent) {
        return {
          user: {
            id: targetStudent.id,
            email: targetStudent.email,
            name: targetStudent.name,
            firstName: targetStudent.firstName,
            lastName: targetStudent.lastName,
            role: targetStudent.role,
            avatarUrl: targetStudent.avatarUrl,
            supabaseUid: targetStudent.supabaseUid ?? "",
          },
          isImpersonating: true,
          realUser,
        };
      }
    }
  }

  return { user: realUser, isImpersonating: false, realUser };
}
