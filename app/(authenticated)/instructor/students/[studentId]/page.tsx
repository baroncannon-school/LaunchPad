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
      teamMemberships: {
        where: { isActive: true },
        include: {
          venture: {
            include: { section: true },
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

      {/* Student header */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-xl font-bold text-blue-700">
            {student.firstName.charAt(0)}
            {student.lastName.charAt(0)}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">
                {student.firstName} {student.lastName}
              </h1>
              <ViewAsStudentButton
                studentId={student.id}
                studentName={`${student.firstName} ${student.lastName}`}
                variant="button"
              />
            </div>
            <p className="text-sm text-gray-500">{student.email}</p>
            <div className="flex gap-2 mt-2">
              {venture && (
                <>
                  <Link
                    href={`/instructor/ventures/${venture.id}`}
                    className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
                  >
                    {venture.name}
                  </Link>
                  <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                    Period {venture.section.period}
                  </span>
                  {membership.teamRole === "LEAD" && (
                    <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                      Lead ★
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Score card */}
        {score && (
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Milestone Score
            </h2>
            <div className="text-center py-4">
              <div className="text-4xl font-bold text-gray-900">
                {score.percentage}%
              </div>
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

        {/* Milestone progress list */}
        <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Milestone Progress
          </h2>
          {student.milestoneProgress.length === 0 ? (
            <p className="text-sm text-gray-500">No progress records yet.</p>
          ) : (
            <div className="space-y-2">
              {student.milestoneProgress.map((p) => {
                const statusColors: Record<string, string> = {
                  NOT_STARTED: "bg-gray-100 text-gray-500",
                  IN_PROGRESS: "bg-yellow-100 text-yellow-700",
                  SUBMITTED: "bg-blue-100 text-blue-700",
                  VERIFIED: "bg-green-100 text-green-700",
                  WAIVED: "bg-purple-100 text-purple-700",
                };
                return (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0"
                  >
                    <span
                      className={`shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-lg text-xs font-bold ${statusColors[p.status]}`}
                    >
                      {p.status === "VERIFIED"
                        ? "✓"
                        : p.status === "WAIVED"
                        ? "W"
                        : p.status === "SUBMITTED"
                        ? "SUB"
                        : p.status === "IN_PROGRESS"
                        ? "IP"
                        : "—"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 truncate">
                        {p.milestoneDefinition.title}
                      </p>
                      <p className="text-xs text-gray-400">
                        {p.milestoneDefinition.phaseLabel} &middot;{" "}
                        {p.milestoneDefinition.period.replace("_", " ")}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
