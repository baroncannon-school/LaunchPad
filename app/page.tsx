import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

// Root page: redirect based on auth state
export default async function HomePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  // Redirect to role-appropriate dashboard
  const dashboards = {
    INSTRUCTOR: "/instructor/dashboard",
    STUDENT: "/student/dashboard",
    MENTOR: "/mentor/dashboard",
  } as const;

  redirect(dashboards[user.role]);
}
