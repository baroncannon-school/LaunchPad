// Auth helper: fetches the current user's app-level profile (with role)
// Used in server components and API routes after Supabase auth is confirmed

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { UserRole } from "@prisma/client";

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
          redirect("/login");
    }
    return user;
}

/**
 * Require a specific role — throws redirect if wrong role.
 */
export async function requireRole(role: UserRole): Promise<AppUser> {
    const user = await requireAuth();
    if (user.role !== role) {
          const ROLE_ROUTES: Record<UserRole, string> = {
                  INSTRUCTOR: "/instructor/dashboard",
                  STUDENT: "/student/dashboard",
                  MENTOR: "/mentor/dashboard",
          };
          redirect(ROLE_ROUTES[user.role]);
    }
    return user;
}
