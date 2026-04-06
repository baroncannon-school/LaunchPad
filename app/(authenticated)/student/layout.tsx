import { requireRole, getEffectiveUser } from "@/lib/auth";
import { NavLink } from "@/components/nav-link";
import { UserMenu } from "@/components/user-menu";
import { ImpersonationBanner } from "@/components/impersonation-banner";

export default async function StudentLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // Allow instructors through when impersonating a student
  await requireRole("STUDENT", { allowImpersonation: true });

  const { user, isImpersonating, realUser } = await getEffectiveUser();

  // When impersonating, show the student's info in the sidebar
  // but display the impersonation banner at top
  const displayUser = isImpersonating ? user : realUser;

  return (
        <div className="flex h-screen">
          {/* Impersonation banner */}
          {isImpersonating && (
                  <ImpersonationBanner studentName={user.name} />
                )}
        
              <div className={`flex h-screen w-full ${isImpersonating ? "pt-10" : ""}`}>
                {/* Sidebar */}
                      <aside className="w-64 flex-shrink-0 border-r border-gray-200 bg-white flex flex-col">
                                <div className="px-4 py-5 border-b border-gray-100">
                                            <h1 className="text-xl font-bold text-gray-900">LaunchPad</h1>h1>
                                            <p className="text-xs text-gray-500 mt-0.5">
                                              {isImpersonating ? (
                          <span className="text-amber-600 font-medium">
                                            Student View {user.firstName}
                          </span>span>
                        ) : (
                          "Student Portal"
                        )}
                                            </p>p>
                                </div>div>
                      
                                <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                                            <NavLink href="/student/dashboard">Dashboard</NavLink>NavLink>
                                            <NavLink href="/student/milestones">Milestones</NavLink>NavLink>
                                            <NavLink href="/student/team">My Team</NavLink>NavLink>
                                            <NavLink href="/student/score">Score</NavLink>NavLink>
                                            <NavLink href="/student/financials">Financials</NavLink>NavLink>
                                            <NavLink href="/student/materials">Materials</NavLink>NavLink>
                                            <NavLink href="/student/grades">Grades</NavLink>NavLink>
                                </nav>nav>
                      
                                <div className="border-t border-gray-200 px-3 py-3">
                                            <UserMenu
                                                            name={displayUser.name}
                                                            email={displayUser.email}
                                                            role={displayUser.role}
                                                            avatarUrl={displayUser.avatarUrl}
                                                          />
                                </div>div>
                      </aside>aside>
              
                      <main className="flex-1 overflow-y-auto bg-gray-50">
                                <div className="p-6 max-w-5xl mx-auto">{children}</div>div>
                      </main>main>
              </div>div>
        </div>div>
      );
}</div>
