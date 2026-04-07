import { requireRole, getEffectiveUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateStudentScore, type ScoreResult } from "@/lib/scoring";
import { WhatIfCalculator } from "@/components/student/what-if-calculator";

// ============================================================================
// Student Score Breakdown Page
//
// Shows the student's current score, a what-if calculator, score history,
// and a full breakdown of all milestones.
// ============================================================================

export default async function StudentScorePage() {
  // Auth check with impersonation support
  await requireRole("STUDENT", { allowImpersonation: true });
  const { user } = await getEffectiveUser();

  // Find the student's active venture
  const membership = await prisma.teamMembership.findFirst({
    where: {
      userId: user.id,
      isActive: true,
    },
    include: {
      venture: true,
    },
  });

  if (!membership) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
        <h2 className="text-lg font-semibold text-amber-900">No Venture Assigned</h2>
        <p className="text-sm text-amber-800 mt-2">
          You're not currently assigned to a venture. Contact your instructor to get started.
        </p>
      </div>
    );
  }

  const { venture } = membership;

  // Fetch all data needed for scoring
  const [allMilestones, progressRecords, scoringRules, recentSnapshots] =
    await Promise.all([
      prisma.milestoneDefinition.findMany({
        orderBy: { sequenceOrder: "asc" },
      }),
      prisma.milestoneProgress.findMany({
        where: { studentId: user.id, ventureId: venture.id },
      }),
      prisma.scoringRule.findMany({ where: { isActive: true } }),
      prisma.scoreSnapshot.findMany({
        where: { studentId: user.id, ventureId: venture.id },
        orderBy: { calculatedAt: "desc" },
        take: 20,
      }),
    ]);

  // Calculate current score
  const scoreResult = calculateStudentScore(
    allMilestones,
    progressRecords,
    {
      ownershipType: venture.ownershipType,
      offeringType: venture.offeringType,
    },
    membership.teamRole,
    scoringRules
  );

  // Build list of incomplete applicable milestones for what-if calculator
  const incompleteApplicable = scoreResult.breakdown.filter(
    (m) => m.isApplicable && !m.isCompleted && m.status !== "WAIVED"
  );

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Your Score</h1>
        <p className="text-gray-600 mt-1">
          Current progress in <span className="font-semibold">{venture.name}</span>
        </p>
      </div>

      {/* Score Overview Card */}
      <ScoreOverviewCard scoreResult={scoreResult} />

      {/* What-If Calculator */}
      {incompleteApplicable.length > 0 && (
        <WhatIfCalculator
          allMilestones={allMilestones}
          progressRecords={progressRecords}
          venture={{
            ownershipType: venture.ownershipType,
            offeringType: venture.offeringType,
          }}
          teamRole={membership.teamRole}
          scoringRules={scoringRules}
          currentScore={scoreResult}
          incompleteApplicable={incompleteApplicable}
        />
      )}

      {/* Score History Chart */}
      {recentSnapshots.length > 0 && (
        <ScoreHistoryChart snapshots={recentSnapshots} />
      )}

      {/* Full Breakdown Table */}
      <ScoreBreakdownTable breakdown={scoreResult.breakdown} />
    </div>
  );
}

// ============================================================================
// Score Overview Card Component
// ============================================================================

function ScoreOverviewCard({ scoreResult }: { scoreResult: ScoreResult }) {
  const percentage = scoreResult.percentage;
  const circumference = 2 * Math.PI * 45; // radius 45
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  // Color based on percentage
  let ringColor = "text-red-500";
  let bgColor = "bg-red-50";
  if (percentage >= 80) {
    ringColor = "text-green-500";
    bgColor = "bg-green-50";
  } else if (percentage >= 60) {
    ringColor = "text-yellow-500";
    bgColor = "bg-yellow-50";
  } else if (percentage >= 40) {
    ringColor = "text-orange-500";
    bgColor = "bg-orange-50";
  }

  return (
    <div className={`rounded-xl border border-gray-200 ${bgColor} p-6`}>
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Score Overview</h2>
          <div className="space-y-2">
            <div>
              <p className="text-sm text-gray-600">Total Score</p>
              <p className="text-3xl font-bold text-gray-900">
                {scoreResult.totalScore.toFixed(2)} / {scoreResult.maxPossibleScore.toFixed(2)}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-300">
              <div>
                <p className="text-xs text-gray-600 uppercase tracking-wide">Completed</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {scoreResult.completedCount} / {scoreResult.applicableCount}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600 uppercase tracking-wide">Progress</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {scoreResult.percentage.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Circular progress indicator */}
        <div className="flex flex-col items-center">
          <svg width="120" height="120" className="transform -rotate-90">
            {/* Background circle */}
            <circle
              cx="60"
              cy="60"
              r="45"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-gray-300"
            />
            {/* Progress circle */}
            <circle
              cx="60"
              cy="60"
              r="45"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              className={ringColor}
              style={{
                strokeDasharray: circumference,
                strokeDashoffset,
                transition: "stroke-dashoffset 0.3s ease",
              }}
            />
            {/* Center text */}
            <text
              x="60"
              y="60"
              textAnchor="middle"
              dy="0.3em"
              className="text-3xl font-bold fill-gray-900"
            >
              {percentage.toFixed(0)}%
            </text>
          </svg>
        </div>
      </div>

      {/* Breakdown by requirement level */}
      <div className="mt-6 pt-6 border-t border-gray-300 grid grid-cols-2 gap-4">
        <div className="bg-white rounded-lg p-3">
          <p className="text-xs text-gray-600 uppercase tracking-wide">Required</p>
          <p className="text-lg font-semibold text-gray-900 mt-1">
            {scoreResult.completedRequired} / {scoreResult.totalRequired}
          </p>
        </div>
        <div className="bg-white rounded-lg p-3">
          <p className="text-xs text-gray-600 uppercase tracking-wide">Optional (Bonus)</p>
          <p className="text-lg font-semibold text-gray-900 mt-1">
            {scoreResult.completedOptional} / {scoreResult.totalOptional}
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Score History Chart Component
// ============================================================================

interface ScoreHistoryChartProps {
  snapshots: Array<{
    calculatedAt: Date;
    calculatedScore: number;
    maxPossible: number;
    percentage: number;
  }>;
}

function ScoreHistoryChart({ snapshots }: ScoreHistoryChartProps) {
  // Reverse to show oldest first (left to right)
  const sorted = [...snapshots].reverse();

  // Find min/max for scaling
  const percentages = sorted.map((s) => s.percentage);
  const minPct = Math.min(...percentages);
  const maxPct = Math.max(...percentages);
  const range = Math.max(maxPct - minPct, 10); // Ensure at least 10% range for visibility

  const getBarHeight = (pct: number) => {
    const normalized = (pct - (minPct - 5)) / (range + 10);
    return Math.max(Math.min(normalized, 1), 0) * 100;
  };

  const getColor = (pct: number) => {
    if (pct >= 80) return "bg-green-500";
    if (pct >= 60) return "bg-yellow-500";
    if (pct >= 40) return "bg-orange-500";
    return "bg-red-500";
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-4">Score History</h2>

      <div className="flex items-end gap-2 h-48">
        {sorted.map((snapshot, idx) => (
          <div key={snapshot.calculatedAt.toString()} className="flex-1 flex flex-col items-center gap-2">
            <div className="w-full flex justify-center">
              <div className="text-xs text-gray-600 font-semibold">
                {snapshot.percentage.toFixed(0)}%
              </div>
            </div>
            <div className="w-full flex justify-center">
              <div
                className={`${getColor(snapshot.percentage)} rounded-t-sm transition-all duration-300`}
                style={{
                  width: "100%",
                  maxWidth: "32px",
                  height: `${getBarHeight(snapshot.percentage)}px`,
                }}
              />
            </div>
            {idx % Math.ceil(sorted.length / 4) === 0 && (
              <div className="text-xs text-gray-500 text-center truncate w-full px-1">
                {snapshot.calculatedAt.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Score Breakdown Table Component
// ============================================================================

interface ScoreBreakdownTableProps {
  breakdown: Array<{
    milestoneId: string;
    title: string;
    phase: string | null;
    period: string;
    requirementLevel: "REQUIRED" | "OPTIONAL";
    isApplicable: boolean;
    isCompleted: boolean;
    status: string;
    earnedPoints: number;
    possiblePoints: number;
    reason: string;
  }>;
}

function ScoreBreakdownTable({ breakdown }: ScoreBreakdownTableProps) {
  // Group by phase
  const byPhase = new Map<string | null, typeof breakdown>();
  for (const item of breakdown) {
    const phase = item.phase || "Other";
    if (!byPhase.has(phase)) {
      byPhase.set(phase, []);
    }
    byPhase.get(phase)!.push(item);
  }

  const phases = Array.from(byPhase.keys()).filter((p) => p !== "Other");
  phases.push("Other");

  const getRowColor = (item: typeof breakdown[0]) => {
    if (!item.isApplicable) return "bg-gray-50";
    if (item.isCompleted) return "bg-green-50";
    if (item.requirementLevel === "REQUIRED") return "bg-amber-50";
    return "bg-white";
  };

  const getStatusBadge = (item: typeof breakdown[0]) => {
    if (!item.isApplicable) {
      return <span className="text-xs text-gray-500">N/A</span>;
    }
    if (item.isCompleted) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          ✓ Complete
        </span>
      );
    }
    if (item.status === "WAIVED") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          Waived
        </span>
      );
    }
    if (item.requirementLevel === "REQUIRED") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
          Required
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
        Optional
      </span>
    );
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-xl font-bold text-gray-900">Milestone Breakdown</h2>
      </div>

      <div className="overflow-x-auto">
        {phases.map((phase) => {
          const items = byPhase.get(phase) || [];
          return (
            <div key={phase}>
              {/* Phase header */}
              <div className="sticky left-0 px-6 py-3 bg-gray-100 border-y border-gray-200">
                <p className="font-semibold text-gray-900">{phase}</p>
              </div>

              <table className="w-full">
                <tbody>
                  {items.map((item) => (
                    <tr
                      key={item.milestoneId}
                      className={`${getRowColor(item)} border-b border-gray-100 hover:bg-opacity-75 transition-colors`}
                    >
                      <td className="px-6 py-3 text-sm font-medium text-gray-900">
                        {item.title}
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-600">{item.period}</td>
                      <td className="px-6 py-3 text-sm">{getStatusBadge(item)}</td>
                      <td className="px-6 py-3 text-sm text-right font-semibold text-gray-900">
                        {item.earnedPoints.toFixed(2)}
                      </td>
                      <td className="px-6 py-3 text-sm text-right text-gray-600">
                        / {item.possiblePoints.toFixed(2)}
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-500 text-right">
                        {item.reason}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    </div>
  );
}
