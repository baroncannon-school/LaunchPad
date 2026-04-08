import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

// Simple date formatting utility
const formatDate = (date: Date, formatStr: string = "MMM d"): string => {
  const d = new Date(date);
  const month = d.toLocaleString("en-US", { month: "short" });
  const day = d.getDate();

  return `${month} ${day}`;
};

export default async function MyTeamsPage() {
  const user = await requireRole("MENTOR");

  // ============================================================================
  // Fetch mentor's assigned ventures with team members
  // ============================================================================
  const assignments = await prisma.mentorAssignment.findMany({
    where: { userId: user.id, isActive: true },
    include: {
      venture: {
        include: {
          section: true,
          teamMemberships: {
            where: { isActive: true },
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  role: true,
                },
              },
            },
          },
          checkIns: {
            orderBy: { conductedDate: "desc" },
            take: 1,
          },
        },
      },
    },
    orderBy: { venture: { name: "asc" } },
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Teams</h1>
        <p className="mt-2 text-sm text-gray-600">
          Manage and track your assigned venture teams.
        </p>
      </div>

      {assignments.length === 0 ? (
        /* Empty State */
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
            />
          </svg>
          <h3 className="mt-4 text-lg font-semibold text-gray-900">
            No teams assigned
          </h3>
          <p className="mt-2 text-sm text-gray-600">
            You'll be notified when the instructor assigns you to mentor teams.
          </p>
          <Link
            href="/mentor/dashboard"
            className="mt-6 inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {assignments.map((assignment: any) => {
            const venture = assignment.venture;
            const studentMembers = venture.teamMemberships.filter(
              (tm: any) => tm.user.role === "STUDENT"
            );
            const lastCheckIn = venture.checkIns[0];

            return (
              <div
                key={venture.id}
                className="rounded-xl border border-gray-200 bg-white p-6 flex flex-col"
              >
                {/* Header */}
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 text-lg">
                    {venture.name}
                  </h3>
                  {venture.description && (
                    <p className="mt-2 text-xs text-gray-600 line-clamp-2">
                      {venture.description}
                    </p>
                  )}

                  {/* Team Members */}
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-xs font-medium text-gray-700 mb-2">
                      Team Members ({studentMembers.length})
                    </p>
                    <div className="space-y-1">
                      {studentMembers.map((tm: any) => (
                        <div key={tm.userId} className="text-xs text-gray-600">
                          <span className="font-medium">
                            {tm.user.firstName} {tm.user.lastName}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Last Check-in */}
                  {lastCheckIn && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <p className="text-xs text-gray-500">
                        Last check-in:{" "}
                        <span className="font-medium text-gray-700">
                          {formatDate(
                            new Date(lastCheckIn.conductedDate || lastCheckIn.createdAt),
                            "MMM d"
                          )}
                        </span>
                      </p>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="mt-6 pt-4 border-t border-gray-200 flex gap-2">
                  <Link
                    href={`/mentor/ventures/${venture.id}`}
                    className="flex-1 inline-flex items-center justify-center rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors"
                  >
                    View Details
                  </Link>
                  <Link
                    href={`/mentor/ventures/${venture.id}/notes`}
                    className="flex-1 inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Notes
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
