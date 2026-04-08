import { requireRole } from "@/lib/auth";
import { NavLink } from "@/components/nav-link";
import { UserMenu } from "@/components/user-menu";
import { NotificationBell } from "@/components/notification-bell";

export default async function MentorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("MENTOR");

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 border-r border-gray-200 bg-white flex flex-col">
        <div className="px-4 py-5 border-b border-gray-100">
          <h1 className="text-xl font-bold text-gray-900">LaunchPad</h1>
          <p className="text-xs text-gray-500 mt-0.5">Mentor Portal</p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <NavLink href="/mentor/dashboard">Dashboard</NavLink>
          <NavLink href="/mentor/ventures">My Teams</NavLink>
        </nav>

        <div className="border-t border-gray-200 px-3 py-3">
          <UserMenu
            name={user.name}
            email={user.email}
            role={user.role}
            avatarUrl={user.avatarUrl}
          />
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto bg-gray-50">
        <div className="flex items-center justify-end px-6 pt-4">
          <NotificationBell />
        </div>
        <div className="px-6 pb-6 max-w-5xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
