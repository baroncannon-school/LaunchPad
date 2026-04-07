import { requireRole, getEffectiveUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

type MilestoneStatus = "NOT_STARTED" | "IN_PROGRESS" | "SUBMITTED" | "VERIFIED" | "WAIVED";
type OwnershipType = "SCHOOL" | "SELF" | "BOTH";
type OfferingType = "PRODUCT" | "SERVICE" | "BOTH";

// Determine if a milestone applies to a venture based on ownership and offering filters
function isMilestoneApplicable(
  ownershipFilter: OwnershipType,
  offeringFilter: OfferingType,
  ventureOwnershipType: OwnershipType,
  ventureOfferingType: OfferingType
): boolean {
  // Ownership filter logic: BOTH matches all, otherwise must match exactly
  if (ownershipFilter !== "BOTH") {
    if (ownershipFilter === "SCHOOL" && ventureOwnershipType !== "SCHOOL") return false;
    if (ownershipFilter === "SELF" && ventureOwnershipType !== "SELF") return false;
  }

  // Offering filter logic: BOTH matches all, otherwise must match venture type
  if (offeringFilter !== "BOTH") {
    if (offeringFilter === "PRODUCT" && ventureOfferingType === "SERVICE") return false;
    if (offeringFilter === "SERVICE" && ventureOfferingType === "PRODUCT") return false;
  }

  return true;
}

function getStatusBadgeColor(status: MilestoneStatus): string {
  switch (status) {
    case "NOT_STARTED":
      return "bg-gray-100 text-gray-700";
    case "IN_PROGRESS":
      return "bg-amber-100 text-amber-700";
    case "SUBMITTED":
      return "bg-blue-100 text-blue-700";
    case "VERIFIED":
      return "bg-green-100 text-green-700";
    case "WAIVED":
      return "bg-purple-100 text-purple-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

function getStatusLabel(status: MilestoneStatus): string {
  switch (status) {
    case "NOT_STARTED":
      return "Not Started";
    case "IN_PROGRESS":
      return "In Progress";
    case "SUBMITTED":
      return "Submitted";
    case "VERIFIED":
      return "Verified";
    case "WAIVED":
      return "Waived";
    default:
      return status;
  }
}

function getRequirementBadgeColor(level: string): string {
  return level === "REQUIRED" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700";
}

interface MilestoneGroup {
  phase: string | null;
  milestones: {
    id: string;
    title: string;
    period: string;
    requirementLevel: string;
    status: MilestoneStatus;
  }[];
}

export default async function StudentMilestonesPage() {
  await requireRole("STUDENT", { allowImpersonation: true });
  const { user, isImpersonating } = await getEffectiveUser();

  // Find student's active venture
  const membership = await prisma.teamMembership.findFirst({
    where: { userId: user.id, isActive: true },
    include: { venture: true },
  });

  if (!membership) {
    return (
      <div>
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Milestones</h1>
          <p className="mt-1 text-sm text-gray-500">
            Track your venture progress across key milestones
          </p>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
          <p className="text-sm text-amber-800">
            {isImpersonating
              ? "This student hasn't been assigned to a venture yet."
              : "You haven't been assigned to a venture yet. Check with your instructor."}
          </p>
        </div>
      </div>
    );
  }

  // Fetch all milestone definitions and student's progress
  const [allMilestones, progressRecords] = await Promise.all([
    prisma.milestoneDefinition.findMany({
      orderBy: { sequenceOrder: "asc" },
    }),
    prisma.milestoneProgress.findMany({
      where: { studentId: user.id, ventureId: membership.ventureId },
    }),
  ]);

  // Filter applicable milestones
  const applicableMilestones = allMilestones.filter((m) =>
    isMilestoneApplicable(
      m.ownershipFilter,
      m.offeringFilter,
      membership.venture.ownershipType,
      membership.venture.offeringType
    )
  );

  // Create progress map for quick lookup
  const progressMap = new Map(
    progressRecords.map((p) => [p.milestoneDefinitionId, p])
  );

  // Count completed milestones
  const completedCount = progressRecords.filter(
    (p) => p.status === "VERIFIED" || p.status === "SUBMITTED"
  ).length;

  // Group by phase
  const grouped: Map<string | null, MilestoneGroup> = new Map();
  for (const milestone of applicableMilestones) {
    const progress = progressMap.get(milestone.id);
    const status = (progress?.status ?? "NOT_STARTED") as MilestoneStatus;

    const phaseKey = milestone.phaseLabel ?? "Other";
    if (!grouped.has(phaseKey)) {
      grouped.set(phaseKey, { phase: phaseKey, milestones: [] });
    }

    grouped.get(phaseKey)!.milestones.push({
      id: milestone.id,
      title: milestone.title,
      period: milestone.period,
      requirementLevel: milestone.requirementLevel,
      status,
    });
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Milestones</h1>
        <p className="mt-1 text-sm text-gray-500">
          Track your venture progress across key milestones
        </p>
      </div>

      {/* Progress bar */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 mb-8">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-gray-700">Overall Progress</p>
          <p className="text-sm font-semibold text-gray-900">
            {completedCount} of {applicableMilestones.length} completed
          </p>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2">
          <div
            className="bg-green-500 h-2 rounded-full transition-all duration-300"
            style={{
              width: `${applicableMilestones.length > 0 ? (completedCount / applicableMilestones.length) * 100 : 0}%`,
            }}
          />
        </div>
      </div>

      {/* Milestones by phase */}
      <div className="space-y-8">
        {Array.from(grouped.values()).map((group) => (
          <div key={group.phase}>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {group.phase}
            </h2>
            <div className="space-y-3">
              {group.milestones.map((milestone) => (
                <Link
                  key={milestone.id}
                  href={`/student/milestones/${milestone.id}`}
                  className="block rounded-xl border border-gray-200 bg-white p-5 hover:border-gray-300 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-medium text-gray-900 line-clamp-2">
                        {milestone.title}
                      </h3>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium bg-gray-100 text-gray-700">
                          {milestone.period}
                        </span>
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${getRequirementBadgeColor(
                            milestone.requirementLevel
                          )}`}
                        >
                          {milestone.requirementLevel === "REQUIRED" ? "Required" : "Optional"}
                        </span>
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap ${getStatusBadgeColor(
                          milestone.status
                        )}`}
                      >
                        {getStatusLabel(milestone.status)}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
