// Authenticated layout wrapper
// All routes under (authenticated) require a valid session.
// This layout fetches the user and makes it available via context.

import { requireAuth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAuth();

  // If somehow a user hits a route that doesn't match their role prefix,
  // the individual role layouts handle that redirect.

  return <>{children}</>;
}
