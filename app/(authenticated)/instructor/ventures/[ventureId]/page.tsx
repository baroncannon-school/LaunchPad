import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { MilestoneGrid } from "@/components/milestones/milestone-grid";

export default async function VentureDetailPage({
  params,
}: {
  params: Promise<{ ventureId: string }>;
}) {
  const user = await requireRole("INSTRUCTOR");
  const { ventureId } = await params;

  // Fetch venture with all related data
  const venture = await prisma.venture.findUnique({
    where: { id: ventureId },
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
      mentorAssignments: {
        where: { isActive: true },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      },
      checkIns: {
        orderBy: { conductedDate: "desc" },
        take: 3,
        include: {
          conductedBy: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });

  if (!venture) notFound();

  // Fetch all milestone definitions and progress for this venture
  const [allMilestones, milestoneProgress] = await Promise.all([
    prisma.milestoneDefinition.findMany({
      orderBy: { sequenceOrder: "asc" },
    }),
    prisma.milestoneProgress.findMany({
      where: { ventureId },
    }),
  ]);

  // Prepare data for the grid
  const studentMembers = venture.teamMemberships
    .filter((tm) => tm.user.role === "STUDENT")
    .map((tm) => ({
      userId: tm.user.id,
      firstName: tm.user.firstName,
      lastName: tm.user.lastName,
      teamRole: tm.teamRole as "LEAD" | "MEMBER",
    }));

  const gridMilestones = allMilestones.map((m) => ({
    id: m.id,
    title: m.title,
    period: m.period,
    phaseLabel: m.phaseLabel,
    requirementLevel: m.requirementLevel as "REQUIRED" | "OPTIONAL",
    ownershipFilter: m.ownershipFilter,
    offeringFilter: m.offeringFilter,
    sequenceOrder: m.sequenceOrder,
  }));

  const gridProgress = milestoneProgress.map((p) => ({
    id: p.id,
    studentId: p.studentId,
    milestoneDefinitionId: p.milestoneDefinitionId,
    status: p.status as "NOT_STARTED" | "IN_PROGRESS" | "SUBMITTED" | "VERIFIED" | "WAIVED",
  }));

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link href="/instructor/ventures" className="hover:text-gray-700">
          Ventures
        </Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">{venture.name}</span>
      </nav>

      {/* Venture header */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 mb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{venture.name}</h1>
            {venture.description && (
              <p className="mt-1 text-sm text-gray-500">{venture.description}</p>
            )}
            <div className="flex gap-2 mt-3">
              <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                {venture.ownershipType}
              </span>
              <span className="inline-flex items-center rounded-full bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-700">
                {venture.offeringType}
              </span>
              <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                Period {venture.section.period}
              </span>
            </div>
          </div>
        </div>

        {/* Team roster */}
        <div className="mt-5 pt-5 border-t border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Team</h3>
          <div className="flex flex-wrap gap-3">
            {venture.teamMemberships
              .filter((tm) => tm.user.role === "STUDENT")
              .map((tm) => (
                <Link
                  key={tm.user.id}
                  href={`/instructor/students/${tm.user.id}`}
                  className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm hover:bg-gray-100 transition-colors"
                >
                  <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700">
                    {tm.user.firstName.charAt(0)}
                    {tm.user.lastName.charAt(0)}
                  </div>
                  <div>
                    <span className="font-medium text-gray-900">
                      {tm.user.firstName} {tm.user.lastName}
                    </span>
                    {tm.teamRole === "LEAD" && (
                      <span className="ml-1 text-amber-500 text-xs">★ Lead</span>
                    )}
                  </div>
                </Link>
              ))}
          </div>

          {/* Mentors */}
          {venture.mentorAssignments.length > 0 && (
            <div className="mt-3">
              <span className="text-xs text-gray-500">Mentors: </span>
              {venture.mentorAssignments.map((ma) => (
                <span key={ma.user.id} className="text-xs text-gray-700 mr-2">
                  {ma.user.firstName} {ma.user.lastName}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Recent check-ins */}
        {venture.checkIns.length > 0 && (
          <div className="mt-5 pt-5 border-t border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">
              Recent Check-ins
            </h3>
            <div className="space-y-1">
              {venture.checkIns.map((ci) => (
                <div key={ci.id} className="flex items-center gap-2 text-sm">
                  <span className="text-gray-400 text-xs w-24 shrink-0">
                    {ci.conductedDate
                      ? new Date(ci.conductedDate).toLocaleDateString()
                      : "Scheduled"}
                  </span>
                  <span className="text-gray-600">
                    by {ci.conductedBy.firstName} {ci.conductedBy.lastName}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Milestone Grid */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Milestone Tracker
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Click any cell to cycle through statuses. Changes save automatically.
        </p>
        <MilestoneGrid
          milestones={gridMilestones}
          members={studentMembers}
          progress={gridProgress}
          ventureId={ventureId}
          ownershipType={venture.ownershipType}
          offeringType={venture.offeringType}
        />
      </div>
    </div>
  );
}
