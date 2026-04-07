import { requireRole, getEffectiveUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateStudentScore } from "@/lib/scoring";
import Link from "next/link";

export default async function StudentDashboard() {
  // Allow instructors through when impersonating
  await requireRole("STUDENT", { allowImpersonation: true });

  // Get the effective user (real student, or impersonated student)
  const { user, isImpersonating } = await getEffectiveUser();

  // ============================================================================
  // Data Fetching
  // ============================================================================

  // Find the student's active venture
  const membership = await prisma.teamMembership.findFirst({
    where: { userId: user.id, isActive: true },
    include: {
      venture: true,
    },
  });

  // If no venture, show minimal UI
  if (!membership) {
    return (
      <div>
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Hey, {user.firstName}!
          </h1>
          <p className="mt-1 text-sm text-amber-600">
            {isImpersonating
              ? "This student hasn\u2019t been assigned to a venture yet."
              : "You haven\u2019t been assigned to a venture yet. Check with your instructor."}
          </p>
        </div>
      </div>
    );
  }

  // Fetch all needed data in parallel
  const [
    allMilestones,
    progressRecords,
    scoringRules,
    latestCheckIn,
    milestoneStats,
  ] = await Promise.all([
    prisma.milestoneDefinition.findMany({ orderBy: { sequenceOrder: "asc" } }),
    prisma.milestoneProgress.findMany({
      where: { studentId: user.id, ventureId: membership.ventureId },
    }),
    prisma.scoringRule.findMany({ where: { isActive: true } }),
    prisma.checkIn.findFirst({
      where: { ventureId: membership.ventureId },
      orderBy: { conductedDate: "desc" },
    }),
    prisma.milestoneProgress.groupBy({
      by: ["status"],
      where: { studentId: user.id, ventureId: membership.ventureId },
      _count: true,
    }),
  ]);

  // ============================================================================
  // Calculate Score
  // ============================================================================

  const scoreResult = calculateStudentScore(
    allMilestones,
    progressRecords,
    {
      ownershipType: membership.venture.ownershipType,
      offeringType: membership.venture.offeringType,
    },
    membership.teamRole,
    scoringRules
  );

  // ============================================================================
  // Filter Applicable Milestones and Status Counts
  // ============================================================================

  const progressMap = new Map(progressRecords.map(p => [p.milestoneDefinitionId, p]));

  // Helper to check if milestone applies to this venture
  const isMilestoneApplicable = (milestone: typeof allMilestones[0]) => {
    const ownership = milestone.ownershipFilter;
    if (ownership !== "BOTH") {
      if (ownership === "SCHOOL" && membership.venture.ownershipType !== "SCHOOL") return false;
      if (ownership === "SELF" && membership.venture.ownershipType !== "SELF") return false;
    }

    const offering = milestone.offeringFilter;
    if (offering !== "BOTH") {
      if (offering === "PRODUCT" && membership.venture.offeringType === "SERVICE") return false;
      if (offering === "SERVICE" && membership.venture.offeringType === "PRODUCT") return false;
    }

    return true;
  };

  // Filter applicable milestones
  const applicableMilestones = allMilestones.filter(isMilestoneApplicable);

  // Get "What To Do Next" milestones: NOT_STARTED or IN_PROGRESS, sorted by sequence
  const nextMilestones = applicableMilestones
    .filter(m => {
      const progress = progressMap.get(m.id);
      const status = progress?.status ?? "NOT_STARTED";
      return status === "NOT_STARTED" || status === "IN_PROGRESS";
    })
    .slice(0, 5);

  // Build status counts for applicable milestones
  const statusCounts = {
    VERIFIED: 0,
    SUBMITTED: 0,
    IN_PROGRESS: 0,
    NOT_STARTED: 0,
  };

  for (const milestone of applicableMilestones) {
    const progress = progressMap.get(milestone.id);
    const status = progress?.status ?? "NOT_STARTED";
    if (status in statusCounts) {
      statusCounts[status as keyof typeof statusCounts]++;
    }
  }

  // ============================================================================
  // Parse Action Items from Latest Check-In
  // ============================================================================

  let actionItems: Array<{
    text: string;
    assignee: string | null;
    dueDate: string | null;
    completed: boolean;
  }> = [];

  if (latestCheckIn?.actionItems) {
    try {
      const allItems = Array.isArray(latestCheckIn.actionItems)
        ? latestCheckIn.actionItems
        : [];

      // Filter items assigned to this student
      actionItems = allItems.filter((item: any) => {
        // Match by assignee name or userId
        return (
          item.assignee === user.name ||
          item.assignee === user.firstName ||
          item.assignee === user.id
        );
      });
    } catch (e) {
      // If parsing fails, leave actionItems empty
    }
  }

  // ============================================================================
  // Find Upcoming Deadlines
  // ============================================================================

  // Get upcoming milestones: not completed yet, with due dates in the future
  const upcomingDeadlines = applicableMilestones
    .filter(m => {
      const progress = progressMap.get(m.id);
      const status = progress?.status ?? "NOT_STARTED";
      // Include if not verified/submitted
      return status !== "VERIFIED" && status !== "SUBMITTED" && status !== "WAIVED";
    })
    .sort((a, b) => a.sequenceOrder - b.sequenceOrder)
    .slice(0, 3);

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Hey, {user.firstName}!
        </h1>
        {membership ? (
          <p className="mt-1 text-sm text-gray-500">
            Working on <span className="font-medium text-gray-700">{membership.venture.name}</span>
            {" "}as {membership.teamRole === "LEAD" ? "Team Lead" : "Team Member"}
          </p>
        ) : null}
      </div>

      {/* Score Card */}
      <div className="mb-8 rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Your Score</h2>
            <p className="mt-2 text-sm text-gray-600">
              Current milestone tracker performance
            </p>
          </div>
          <Link
            href="/student/score"
            className="text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            View details →
          </Link>
        </div>

        <div className="mt-6 flex items-center gap-6">
          {/* Score Circle */}
          <div className="relative h-24 w-24">
            <svg className="h-full w-full" viewBox="0 0 100 100">
              {/* Background circle */}
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="3"
              />
              {/* Progress circle */}
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="#3b82f6"
                strokeWidth="3"
                strokeDasharray={`${(scoreResult.percentage / 100) * 283} 283`}
                strokeLinecap="round"
                transform="rotate(-90 50 50)"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-gray-900">
                {scoreResult.percentage.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Score Details */}
          <div>
            <p className="text-sm text-gray-600">
              <span className="font-semibold text-gray-900">
                {scoreResult.totalScore.toFixed(2)}
              </span>
              {" "}/ {scoreResult.maxPossibleScore.toFixed(2)} points
            </p>
            <p className="mt-2 text-sm text-gray-600">
              <span className="font-semibold text-gray-900">
                {scoreResult.completedCount}
              </span>
              {" "}of {scoreResult.applicableCount} milestones completed
            </p>
          </div>
        </div>
      </div>

      {/* What To Do Next */}
      <div className="mb-8 rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          What to Do Next
        </h2>
        {nextMilestones.length > 0 ? (
          <ul className="space-y-3">
            {nextMilestones.map((milestone) => {
              const progress = progressMap.get(milestone.id);
              const status = progress?.status ?? "NOT_STARTED";
              return (
                <li key={milestone.id}>
                  <Link
                    href={`/student/milestones/${milestone.id}`}
                    className="block rounded-lg border border-gray-100 bg-gray-50 p-3 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {milestone.title}
                        </p>
                        {milestone.phaseLabel && (
                          <p className="mt-1 text-xs text-gray-500">
                            {milestone.phaseLabel}
                          </p>
                        )}
                        <p className="mt-1 text-xs text-gray-600">
                          {milestone.requirementLevel === "REQUIRED"
                            ? "Required"
                            : "Optional"}
                        </p>
                      </div>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          status === "IN_PROGRESS"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {status === "IN_PROGRESS" ? "In Progress" : "Not Started"}
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">
            {isImpersonating
              ? "All applicable milestones are complete!"
              : "All your applicable milestones are complete!"}
          </p>
        )}
      </div>

      {/* Quick Stats */}
      <div className="mb-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
        <MiniStat
          label="Verified"
          value={statusCounts.VERIFIED}
          color="text-green-600"
        />
        <MiniStat
          label="Submitted"
          value={statusCounts.SUBMITTED}
          color="text-blue-600"
        />
        <MiniStat
          label="In Progress"
          value={statusCounts.IN_PROGRESS}
          color="text-amber-600"
        />
        <MiniStat
          label="Not Started"
          value={statusCounts.NOT_STARTED}
          color="text-gray-400"
        />
      </div>

      {/* Recent Action Items */}
      <div className="mb-8 rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Action Items from Check-In
        </h2>
        {actionItems.length > 0 ? (
          <ul className="space-y-2">
            {actionItems.map((item, idx) => (
              <li key={idx} className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={item.completed}
                  disabled
                  className="mt-1 h-4 w-4 text-gray-400"
                />
                <div className="flex-1">
                  <p
                    className={`text-sm ${
                      item.completed
                        ? "line-through text-gray-400"
                        : "text-gray-900"
                    }`}
                  >
                    {item.text}
                  </p>
                  {item.dueDate && (
                    <p className="text-xs text-gray-500 mt-1">
                      Due: {new Date(item.dueDate).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">
            No check-ins yet. Check back after your next team meeting!
          </p>
        )}
      </div>

      {/* Upcoming Deadlines */}
      {upcomingDeadlines.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Upcoming Milestones
          </h2>
          <ul className="space-y-2">
            {upcomingDeadlines.map((milestone) => (
              <li key={milestone.id} className="flex items-start justify-between py-2 border-b border-gray-100 last:border-b-0">
                <div>
                  <p className="font-medium text-gray-900 text-sm">
                    {milestone.title}
                  </p>
                  {milestone.phaseLabel && (
                    <p className="text-xs text-gray-500">{milestone.phaseLabel}</p>
                  )}
                </div>
                <span className="text-xs text-gray-500">
                  {milestone.period}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
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
