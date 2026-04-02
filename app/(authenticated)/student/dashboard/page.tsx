import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function StudentDashboard() {
  const user = await requireRole("STUDENT");

  // Find the student's active venture
  const membership = await prisma.teamMembership.findFirst({
    where: { userId: user.id, isActive: true },
    include: {
      venture: true,
    },
  });

  // Count milestone progress
  const milestoneStats = membership
    ? await prisma.milestoneProgress.groupBy({
        by: ["status"],
        where: { studentId: user.id, ventureId: membership.ventureId },
        _count: true,
      })
    : [];

  const statusCounts = Object.fromEntries(
    milestoneStats.map((s) => [s.status, s._count])
  );

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Hey, {user.firstName}!
        </h1>
        {membership ? (
          <p className="mt-1 text-sm text-gray-500">
            Working on <span className="font-medium text-gray-700">{membership.venture.name}</span>
            {" "}as {membership.teamRole === "LEAD" ? "Team Lead" : "Team Member"}
          </p>
        ) : (
          <p className="mt-1 text-sm text-amber-600">
            You haven&apos;t been assigned to a venture yet. Check with your instructor.
          </p>
        )}
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <MiniStat label="Verified" value={statusCounts.VERIFIED ?? 0} color="text-green-600" />
        <MiniStat label="Submitted" value={statusCounts.SUBMITTED ?? 0} color="text-blue-600" />
        <MiniStat label="In Progress" value={statusCounts.IN_PROGRESS ?? 0} color="text-amber-600" />
        <MiniStat label="Not Started" value={statusCounts.NOT_STARTED ?? 0} color="text-gray-400" />
      </div>

      {/* Placeholder sections */}
      <div className="space-y-6">
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            What to Do Next
          </h2>
          <p className="text-sm text-gray-500">
            Your upcoming and overdue milestones will appear here, prioritized by deadline.
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Score Overview
          </h2>
          <p className="text-sm text-gray-500">
            Your current milestone tracker score and progress bar will appear here.
          </p>
        </div>
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  );
}
