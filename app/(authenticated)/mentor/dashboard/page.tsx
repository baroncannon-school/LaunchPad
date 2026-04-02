import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function MentorDashboard() {
  const user = await requireRole("MENTOR");

  // Fetch assigned ventures
  const assignments = await prisma.mentorAssignment.findMany({
    where: { userId: user.id, isActive: true },
    include: {
      venture: {
        include: {
          teamMemberships: {
            where: { isActive: true },
            include: { user: { select: { name: true, firstName: true } } },
          },
        },
      },
    },
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome, {user.firstName}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          You&apos;re mentoring {assignments.length} venture{assignments.length !== 1 ? "s" : ""}.
        </p>
      </div>

      {assignments.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-center">
          <p className="text-sm text-gray-500">
            No ventures assigned yet. The instructor will assign you to teams soon.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {assignments.map((a) => (
            <a
              key={a.ventureId}
              href={`/mentor/ventures/${a.ventureId}`}
              className="rounded-xl border border-gray-200 bg-white p-6 hover:border-brand-300 hover:shadow-sm transition-all"
            >
              <h3 className="font-semibold text-gray-900">
                {a.venture.name}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                {a.venture.teamMemberships.length} team member{a.venture.teamMemberships.length !== 1 ? "s" : ""}
              </p>
              <div className="mt-3 flex flex-wrap gap-1">
                {a.venture.teamMemberships.map((tm) => (
                  <span
                    key={tm.userId}
                    className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600"
                  >
                    {tm.user.firstName}
                  </span>
                ))}
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
