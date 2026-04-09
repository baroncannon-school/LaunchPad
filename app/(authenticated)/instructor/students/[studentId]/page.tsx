import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { calculateStudentScore } from "@/lib/scoring";
import { ViewAsStudentButton } from "@/components/view-as-student-button";

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  await requireRole("INSTRUCTOR");
  const { studentId } = await params;

  const student = await prisma.user.findUnique({
    where: { id: studentId },
    include: {
      enrollments: {
        include: { section: true },
      },
      teamMemberships: {
        where: { isActive: true },
        include: {
          venture: {
            include: {
              section: true,
              teamMemberships: {
                where: { isActive: true },
                include: { user: { select: { id: true, firstName: true, lastName: true } } },
              },
            },
          },
        },
      },
      milestoneProgress: {
        include: { milestoneDefinition: true },
        orderBy: { milestoneDefinition: { sequenceOrder: "asc" } },
      },
      gradeRecords: {
        include: { semesterConfig: true },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
      activityLogs: {
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { venture: true },
      },
    },
  });

  if (!student || student.role !== "STUDENT") notFound();

  const membership = student.teamMemberships[0];
  const venture = membership?.venture;

  // Calculate score if venture exists
  let score = null;
  if (venture && membership) {
    const [allMilestones, scoringRules] = await Promise.all([
      prisma.milestoneDefinition.findMany({ orderBy: { sequenceOrder: "asc" } }),
      prisma.scoringRule.findMany({ where: { isActive: true } }),
    ]);

    score = calculateStudentScore(
      allMilestones,
      student.milestoneProgress.map((p) => ({
        milestoneDefinitionId: p.milestoneDefinitionId,
        status: p.status,
      })),
      { ownershipType: venture.ownershipType, offeringType: venture.offeringType },
      membership.teamRole,
      scoringRules.map((r) => ({
        teamRole: r.teamRole,
        requirement: r.requirement,
        multiplier: r.multiplier,
      }))
    );
  }

  // Group milestone progress by status
  const milestonesByStatus = {
    COMPLETED: student.milestoneProgress.filter(
      (p) => p.status === "VERIFIED" || p.status === "WAIVED"
    ),
    IN_PROGRESS: student.milestoneProgress.filter((p) => p.status === "IN_PROGRESS"),
    SUBMITTED: student.milestoneProgress.filter((p) => p.status === "SUBMITTED"),
    NOT_STARTED: student.milestoneProgress.filter((p) => p.status === "NOT_STARTED"),
  };

  const totalMilestones = student.milestoneProgress.length;
  const completedMilestones = milestonesByStatus.COMPLETED.length;
  const progressPercentage =
    totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link href="/instructor/students" className="hover:text-gray-700">
          Students
        </Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">
          {student.firstName} {student.lastName}
        </span>
      </nav>

      {/* Student Info Header */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4 flex-1">
            <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-xl font-bold text-blue-700 shrink-0">
              {student.firstName.charAt(0)}
              {student.lastName.charAt(0)}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-gray-900">
                  {student.firstName} {student.lastName}
                </h1>
                <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                  {student.role}
                </span>
                {student.isActive && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-600"></span>
                    Active
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 mt-1">{student.email}</p>
            </div>
          </div>
          <ViewAsStudentButton
            studentId={student.id}
            studentName={`${student.firstName} ${student.lastName}`}
            variant="button"
          />
        </div>
      </div>

      {/* Venture & Team Info */}
      {venture && membership && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Venture & Team</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Venture</h3>
              <Link
                href={`/instructor/ventures/${venture.id}`}
                className="text-lg font-semibold text-blue-600 hover:text-blue-700"
              >
                {venture.name}
              </Link>
              <div className="flex gap-2 mt-3">
                <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                  Period {venture.section.period}
                </span>
                <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                  {venture.status}
                </span>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Team Role</h3>
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold text-gray-900">
                  {membership.teamRole}
                </span>
                {membership.teamRole === "LEAD" && (
                  <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                    Lead ★
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-3">
                {venture.teamMemberships?.length || 0} team members total
              </p>
            </div>
          </div>
          {venture.teamMemberships && venture.teamMemberships.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Team Members</h4>
              <div className="flex flex-wrap gap-2">
                {venture.teamMemberships.map((tm) => (
                  <span
                    key={tm.userId}
                    className="inline-flex items-center gap-1.5 rounded-full bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-700"
                  >
                    {tm.user.firstName} {tm.user.lastName}
                    {tm.teamRole === "LEAD" && <span>★</span>}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Score Summary & Milestone Progress Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Score Summary */}
        {score && (
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Score Summary</h2>
            <div className="text-center py-4">
              <div className="text-4xl font-bold text-gray-900">{score.percentage}%</div>
              <div className="text-sm text-gray-500 mt-1">
                {score.totalScore.toFixed(2)} / {score.maxPossibleScore.toFixed(2)} pts
              </div>
            </div>
            <div className="space-y-2 mt-4 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Required completed</span>
                <span className="font-medium">
                  {score.completedRequired} / {score.totalRequired}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Optional completed</span>
                <span className="font-medium">
                  {score.completedOptional} / {score.totalOptional}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Total milestones</span>
                <span className="font-medium">
                  {score.completedCount} / {score.applicableCount}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Milestone Progress */}
        <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Milestone Progress</h2>
          {student.milestoneProgress.length === 0 ? (
            <p className="text-sm text-gray-500">No progress records yet.</p>
          ) : (
            <div className="space-y-4">
              {/* Progress Bar */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">Overall Progress</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {completedMilestones} / {totalMilestones}
                  </span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 transition-all"
                    style={{ width: `${progressPercentage}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-1">{progressPercentage}% complete</p>
              </div>

              {/* Status Summary */}
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div className="rounded-lg bg-green-50 p-2">
                  <p className="font-semibold text-green-700">
                    {milestonesByStatus.COMPLETED.length}
                  </p>
                  <p className="text-green-600 text-xs">Completed</p>
                </div>
                <div className="rounded-lg bg-yellow-50 p-2">
                  <p className="font-semibold text-yellow-700">
                    {milestonesByStatus.IN_PROGRESS.length}
                  </p>
                  <p className="text-yellow-600 text-xs">In Progress</p>
                </div>
                <div className="rounded-lg bg-blue-50 p-2">
                  <p className="font-semibold text-blue-700">
                    {milestonesByStatus.SUBMITTED.length}
                  </p>
                  <p className="text-blue-600 text-xs">Submitted</p>
                </div>
                <div className="rounded-lg bg-gray-100 p-2">
                  <p className="font-semibold text-gray-700">
                    {milestonesByStatus.NOT_STARTED.length}
                  </p>
                  <p className="text-gray-600 text-xs">Not Started</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Grade Summary */}
      {student.gradeRecords.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Grade Summary</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">
                    Category
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Label</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Score</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">
                    Max Score
                  </th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">
                    Percentage
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Semester</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {student.gradeRecords.slice(0, 10).map((grade) => {
                  const percentage =
                    grade.maxScore > 0
                      ? Math.round((grade.score / grade.maxScore) * 100)
                      : 0;
                  const percentageColor =
                    percentage >= 80
                      ? "text-green-700"
                      : percentage >= 70
                      ? "text-yellow-700"
                      : "text-red-700";

                  return (
                    <tr key={grade.id} className="hover:bg-gray-50">
                      <td className="py-3 px-4 text-gray-900">{grade.category}</td>
                      <td className="py-3 px-4 text-gray-600">{grade.label}</td>
                      <td className="py-3 px-4 text-right text-gray-900 font-medium">
                        {grade.score.toFixed(1)}
                      </td>
                      <td className="py-3 px-4 text-right text-gray-600">
                        {grade.maxScore.toFixed(1)}
                      </td>
                      <td className={`py-3 px-4 text-right font-semibold ${percentageColor}`}>
                        {percentage}%
                      </td>
                      <td className="py-3 px-4 text-xs text-gray-500">
                        {grade.semesterConfig.semester}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {student.gradeRecords.length > 10 && (
            <p className="text-xs text-gray-500 mt-3">
              Showing 10 of {student.gradeRecords.length} grades
            </p>
          )}
        </div>
      )}

      {/* Recent Activity */}
      {student.activityLogs.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
          <div className="space-y-3">
            {student.activityLogs.map((activity) => {
              const timestamp = new Date(activity.createdAt);
              const timeAgo = formatTimeAgo(timestamp);

              return (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0"
                >
                  <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 shrink-0"></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">
                      <span className="font-medium">{activity.action}</span>
                      {activity.venture && (
                        <>
                          {" "}
                          in{" "}
                          <span className="font-medium text-blue-600">
                            {activity.venture.name}
                          </span>
                        </>
                      )}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{timeAgo}</p>
                  </div>
                </div>
              );
            })}
          </div>
          {student.activityLogs.length === 0 && (
            <p className="text-sm text-gray-500">No activity recorded yet.</p>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Format timestamp as relative time (e.g., "2 hours ago")
 */
function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffWeeks = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 7));

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffWeeks < 4) return `${diffWeeks}w ago`;

  return date.toLocaleDateString();
}
