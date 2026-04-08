import { requireRole } from "@/lib/auth";
import { NavLink } from "@/components/nav-link";
import { UserMenu } from "@/components/user-menu";
import { NotificationBell } from "@/components/notification-bell";

export default async function InstructorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("INSTRUCTOR");

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 border-r border-gray-200 bg-white flex flex-col">
        {/* Logo */}
        <div className="px-4 py-5 border-b border-gray-100">
          <h1 className="text-xl font-bold text-gray-900">LaunchPad</h1>
          <p className="text-xs text-gray-500 mt-0.5">Instructor Portal</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <NavLink href="/instructor/dashboard">Dashboard</NavLink>
          <NavLink href="/instructor/ventures">Ventures</NavLink>
          <NavLink href="/instructor/students">Students</NavLink>
          <NavLink href="/instructor/milestones">Milestones</NavLink>
          <NavLink href="/instructor/gradebook">Gradebook</NavLink>
          <NavLink href="/instructor/materials">Materials</NavLink>

          <div className="pt-4 mt-4 border-t border-gray-100">
            <NavLink href="/instructor/settings">Settings</NavLink>
          </div>
        </nav>

        {/* User menu */}
        <div className="border-t border-gray-200 px-3 py-3">
          <UserMenu
            name={user.name}
            email={user.email}
            role={user.role}
            avatarUrl={user.avatarUrl}
          />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-gray-50">
        <div className="flex items-center justify-end px-6 pt-4">
          <NotificationBell />
        </div>
        <div className="px-6 pb-6 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
