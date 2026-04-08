import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

// Simple date formatting utility
const formatDate = (date: Date, formatStr: string = "MMM d, yyyy"): string => {
  const d = new Date(date);
  const month = d.toLocaleString("en-US", { month: "short" });
  const day = d.getDate();
  const year = d.getFullYear();

  if (formatStr === "MMM d, yyyy") return `${month} ${day}, ${year}`;
  if (formatStr === "EEEE, MMM d, yyyy") {
    const dayName = d.toLocaleString("en-US", { weekday: "long" });
    return `${dayName}, ${month} ${day}, ${year}`;
  }
  return d.toLocaleDateString();
};

export default async function MentorDashboard() {
  const user = await requireRole("MENTOR");

  // ============================================================================
  // Fetch mentor's assigned ventures with team members and check-in data
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

  // ============================================================================
  // Fetch upcoming milestones across all assigned ventures
  // ============================================================================
  const ventureIds = assignments.map((a: any) => a.ventureId);

  const upcomingMilestones = await prisma.milestoneDefinition.findMany({
    where: {
      period: {
        in: ["P1_NOV", "P2_DEC", "P3_JAN", "P4_FEB", "P5_MAR", "P6_APR"],
      },
    },
    orderBy: { sequenceOrder: "asc" },
    take: 6,
  });

  // Count incomplete milestone progress for each milestone across assigned ventures
  const milestoneStats = await Promise.all(
    upcomingMilestones.map(async (milestone: any): Promise<any> => {
      const incomplete = await prisma.milestoneProgress.count({
        where: {
          milestoneDefinitionId: milestone.id,
          ventureId: { in: ventureIds },
          status: { notIn: ["VERIFIED", "WAIVED"] },
        },
      });
      return { milestone, incompleteCount: incomplete };
    })
  );

  // ============================================================================
  // Fetch overall check-in schedule
  // ============================================================================
  const nextCheckIns = await prisma.checkIn.findMany({
    where: {
      ventureId: { in: ventureIds },
      nextCheckInDate: { gt: new Date() },
    },
    orderBy: { nextCheckInDate: "asc" },
    take: 5,
    include: {
      venture: { select: { name: true } },
    },
  });

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {user.firstName}
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          You&apos;re mentoring {assignments.length} venture{assignments.length !== 1 ? "s" : ""}. Stay on top of milestones and check-ins.
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
            No ventures assigned yet
          </h3>
          <p className="mt-2 text-sm text-gray-600">
            The instructor will assign you to mentor teams soon. Check back here for updates.
          </p>
        </div>
      ) : (
        <>
          {/* Ventures Grid */}
          <div>
            <h2 className="mb-4 text-xl font-bold text-gray-900">Your Teams</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {assignments.map((assignment: any) => {
                const venture = assignment.venture;
                const teamMembers = venture.teamMemberships.filter(
                  (tm: any) => tm.user.role === "STUDENT"
                );
                const lastCheckIn = venture.checkIns[0];

                return (
                  <Link
                    key={venture.id}
                    href={`/mentor/ventures/${venture.id}`}
                    className="rounded-xl border border-gray-200 bg-white p-6 hover:border-blue-300 hover:shadow-md transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 text-lg">
                          {venture.name}
                        </h3>
                        {venture.description && (
                          <p className="mt-1 text-xs text-gray-500 line-clamp-2">
                            {venture.description}
                          </p>
                        )}
                        <div className="mt-3">
                          <p className="text-xs text-gray-600 font-medium">
                            {teamMembers.length} team member{teamMembers.length !== 1 ? "s" : ""}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Team members pills */}
                    <div className="mt-4 flex flex-wrap gap-1">
                      {teamMembers.map((tm: any) => (
                        <span
                          key={tm.userId}
                          className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700"
                        >
                          {tm.user.firstName}
                        </span>
                      ))}
                    </div>

                    {/* Last check-in info */}
                    {lastCheckIn && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <p className="text-xs text-gray-500">
                          Last check-in:{" "}
                          <span className="font-medium text-gray-700">
                            {formatDate(
                              new Date(lastCheckIn.conductedDate || lastCheckIn.createdAt),
                              "MMM d, yyyy"
                            )}
                          </span>
                        </p>
                        {lastCheckIn.nextCheckInDate && (
                          <p className="mt-1 text-xs text-gray-500">
                            Next scheduled:{" "}
                            <span className="font-medium text-gray-700">
                              {formatDate(
                                new Date(lastCheckIn.nextCheckInDate),
                                "MMM d, yyyy"
                              )}
                            </span>
                          </p>
                        )}
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Upcoming Milestones */}
          {upcomingMilestones.length > 0 && (
            <div>
              <h2 className="mb-4 text-xl font-bold text-gray-900">
                Milestone Progress Overview
              </h2>
              <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                <div className="divide-y divide-gray-200">
                  {milestoneStats.map(({ milestone, incompleteCount }) => (
                    <div
                      key={milestone.id}
                      className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold text-gray-900">
                          {milestone.title}
                        </h4>
                        {milestone.phaseLabel && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            {milestone.phaseLabel}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-medium text-amber-700 bg-amber-50 rounded-full px-3 py-1 inline-block">
                          {incompleteCount} pending
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Upcoming Check-in Schedule */}
          {nextCheckIns.length > 0 && (
            <div>
              <h2 className="mb-4 text-xl font-bold text-gray-900">
                Next Check-ins
              </h2>
              <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                <div className="divide-y divide-gray-200">
                  {nextCheckIns.map((checkIn: any) => (
                    <div
                      key={checkIn.id}
                      className="p-4 flex items-center justify-between"
                    >
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {checkIn.venture.name}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Scheduled for {formatDate(
                            new Date(checkIn.nextCheckInDate!),
                            "EEEE, MMM d, yyyy"
                          )}
                        </p>
                      </div>
                      <div className="text-xs font-medium text-gray-600 bg-gray-100 rounded-full px-3 py-1 inline-block">
                        {Math.ceil(
                          (new Date(checkIn.nextCheckInDate!).getTime() -
                            new Date().getTime()) /
                            (1000 * 60 * 60 * 24)
                        )}{" "}
                        days
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
