import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";

// Simple date formatting utility
const formatDate = (date: Date, formatStr: string = "MMM d, yyyy"): string => {
  const d = new Date(date);
  const month = d.toLocaleString("en-US", { month: "short" });
  const day = d.getDate();
  const year = d.getFullYear();
  const mins = String(d.getMinutes()).padStart(2, "0");
  const ampm = d.getHours() >= 12 ? "PM" : "AM";

  if (formatStr === "MMM d, yyyy") return `${month} ${day}, ${year}`;
  if (formatStr === "MMMM d, yyyy 'at' h:mm a") {
    const monthFull = d.toLocaleString("en-US", { month: "long" });
    const hour12 = d.getHours() % 12 || 12;
    return `${monthFull} ${day}, ${year} at ${hour12}:${mins} ${ampm}`;
  }
  return d.toLocaleDateString();
};

export default async function VentureDetailPage({
  params,
}: {
  params: Promise<{ ventureId: string }>;
}) {
  const user = await requireRole("MENTOR");
  const { ventureId } = await params;

  // ============================================================================
  // Verify mentor is assigned to this venture
  // ============================================================================
  const mentorAssignment = await prisma.mentorAssignment.findFirst({
    where: {
      userId: user.id,
      ventureId,
      isActive: true,
    },
  });

  if (!mentorAssignment) {
    notFound();
  }

  // ============================================================================
  // Fetch venture details
  // ============================================================================
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
    },
  });

  if (!venture) {
    notFound();
  }

  // ============================================================================
  // Fetch milestone definitions and progress for this venture
  // ============================================================================
  const [allMilestones, milestoneProgress] = await Promise.all([
    prisma.milestoneDefinition.findMany({
      orderBy: { sequenceOrder: "asc" },
    }),
    prisma.milestoneProgress.findMany({
      where: { ventureId },
    }),
  ]);

  // ============================================================================
  // Fetch check-ins for this venture
  // ============================================================================
  const checkIns = await prisma.checkIn.findMany({
    where: { ventureId },
    include: {
      conductedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
      attendees: {
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      },
    },
    orderBy: { conductedDate: "desc" },
  });

  // ============================================================================
  // Prepare data for display
  // ============================================================================
  const studentMembers = venture.teamMemberships
    .filter((tm: any) => tm.user.role === "STUDENT")
    .map((tm: any) => ({
      userId: tm.user.id,
      firstName: tm.user.firstName,
      lastName: tm.user.lastName,
      email: tm.user.email,
    }));

  // Create a map of milestone progress: studentId -> milestoneId -> status
  const progressMap: Record<string, Record<string, string>> = {};
  milestoneProgress.forEach((progress: any) => {
    if (!progressMap[progress.studentId]) {
      progressMap[progress.studentId] = {};
    }
    progressMap[progress.studentId][progress.milestoneDefinitionId] =
      progress.status;
  });

  // Count completed milestones per student
  const studentStats = studentMembers.map((student: any) => {
    const studentProgress = progressMap[student.userId] || {};
    const completed = Object.values(studentProgress).filter(
      (status) => status === "VERIFIED"
    ).length;
    return {
      ...student,
      completedCount: completed,
      totalApplicable: allMilestones.length,
    };
  });

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/mentor/dashboard" className="hover:text-gray-700">
          Dashboard
        </Link>
        <span>/</span>
        <Link href="/mentor/ventures" className="hover:text-gray-700">
          My Teams
        </Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">{venture.name}</span>
      </nav>

      {/* Venture Header */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{venture.name}</h1>
            {venture.description && (
              <p className="mt-2 text-sm text-gray-600">{venture.description}</p>
            )}
            <div className="mt-4 flex flex-wrap gap-4 text-xs font-medium">
              <div>
                <span className="text-gray-500">Ownership Type:</span>
                <span className="ml-2 text-gray-900 font-semibold">
                  {venture.ownershipType.replace(/_/g, " ")}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Offering Type:</span>
                <span className="ml-2 text-gray-900 font-semibold">
                  {venture.offeringType.replace(/_/g, " ")}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Status:</span>
                <span className="ml-2 text-gray-900 font-semibold">
                  {venture.status.replace(/_/g, " ")}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Team Members Progress */}
      <div>
        <h2 className="mb-4 text-lg font-bold text-gray-900">Team Members</h2>
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">
                    Email
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700">
                    Milestones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {studentStats.map((student: any) => (
                  <tr key={student.userId} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {student.firstName} {student.lastName}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-600">{student.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-center">
                        <div className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1">
                          <span className="text-sm font-semibold text-blue-700">
                            {student.completedCount}/{student.totalApplicable}
                          </span>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Milestone Grid - Mentors can see status but NOT scores */}
      <div>
        <h2 className="mb-4 text-lg font-bold text-gray-900">Milestone Status</h2>
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-full">
              <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 min-w-[250px]">
                    Milestone
                  </th>
                  {studentMembers.map((student: any) => (
                    <th
                      key={student.userId}
                      className="px-3 py-3 text-center text-xs font-semibold text-gray-700 whitespace-nowrap"
                    >
                      {student.firstName}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {allMilestones.map((milestone: any) => (
                  <tr key={milestone.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm">
                      <div className="font-medium text-gray-900">
                        {milestone.title}
                      </div>
                      {milestone.phaseLabel && (
                        <div className="text-xs text-gray-500 mt-0.5">
                          {milestone.phaseLabel}
                        </div>
                      )}
                    </td>
                    {studentMembers.map((student: any) => {
                      const status = progressMap[student.userId]?.[milestone.id];
                      const statusColor =
                        status === "VERIFIED"
                          ? "bg-green-50 text-green-700"
                          : status === "SUBMITTED"
                            ? "bg-blue-50 text-blue-700"
                            : status === "IN_PROGRESS"
                              ? "bg-amber-50 text-amber-700"
                              : status === "WAIVED"
                                ? "bg-gray-50 text-gray-700"
                                : "bg-gray-100 text-gray-600";

                      const statusLabel =
                        status === "VERIFIED"
                          ? "✓ Verified"
                          : status === "SUBMITTED"
                            ? "Submitted"
                            : status === "IN_PROGRESS"
                              ? "In Progress"
                              : status === "WAIVED"
                                ? "Waived"
                                : "Not Started";

                      return (
                        <td
                          key={student.userId}
                          className="px-3 py-4 text-center"
                        >
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${statusColor}`}
                          >
                            {statusLabel}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Check-in Log */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Check-in Log</h2>
          <Link
            href={`/mentor/ventures/${ventureId}/conduct-check-in`}
            className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            + Conduct Check-in
          </Link>
        </div>

        {checkIns.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-6 text-center">
            <p className="text-sm text-gray-500">
              No check-ins conducted yet. Start by conducting your first check-in.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {checkIns.map((checkIn: any) => (
              <div
                key={checkIn.id}
                className="rounded-xl border border-gray-200 bg-white p-6"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-gray-900">
                        {checkIn.conductedBy.firstName}{" "}
                        {checkIn.conductedBy.lastName}
                      </h3>
                      <span className="text-xs text-gray-500">conducted</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDate(
                        new Date(checkIn.conductedDate || checkIn.createdAt),
                        "MMMM d, yyyy 'at' h:mm a"
                      )}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1">
                      <span className="text-xs font-medium text-gray-700">
                        {checkIn.attendees.length} attendees
                      </span>
                    </div>
                  </div>
                </div>

                {/* Attendees */}
                <div className="mt-3">
                  <p className="text-xs text-gray-600 font-medium mb-2">
                    Attendees:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {checkIn.attendees.map((attendee: any) => (
                      <span
                        key={attendee.userId}
                        className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs text-blue-700"
                      >
                        {attendee.user.firstName} {attendee.user.lastName}
                        {!attendee.wasPresent && (
                          <span className="ml-1 opacity-60">(absent)</span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                {checkIn.notes && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-xs font-medium text-gray-700 mb-2">
                      Notes:
                    </p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {checkIn.notes}
                    </p>
                  </div>
                )}

                {/* Action Items */}
                {checkIn.actionItems &&
                  Array.isArray(checkIn.actionItems) &&
                  checkIn.actionItems.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <p className="text-xs font-medium text-gray-700 mb-3">
                        Action Items:
                      </p>
                      <ul className="space-y-2">
                        {(checkIn.actionItems as any[]).map((item, idx) => (
                          <li key={idx} className="text-sm text-gray-700">
                            <div className="flex items-start gap-2">
                              <span className="text-xs text-gray-400 mt-1">
                                •
                              </span>
                              <div>
                                <p className="font-medium">{item.text}</p>
                                {item.assignee && (
                                  <p className="text-xs text-gray-500 mt-0.5">
                                    Assigned to: {item.assignee}
                                  </p>
                                )}
                                {item.dueDate && (
                                  <p className="text-xs text-gray-500">
                                    Due: {formatDate(new Date(item.dueDate), "MMM d, yyyy")}
                                  </p>
                                )}
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                {/* Next Check-in */}
                {checkIn.nextCheckInDate && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-xs text-gray-500">
                      Next scheduled:{" "}
                      <span className="font-medium text-gray-700">
                        {formatDate(
                          new Date(checkIn.nextCheckInDate),
                          "MMM d, yyyy"
                        )}
                      </span>
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
