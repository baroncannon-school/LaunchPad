import { requireRole, getEffectiveUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Venture, User, TeamMembership, MentorAssignment, CheckIn, MilestoneProgress } from "@prisma/client";

function format(date: Date | string, _pattern: string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ============================================================================
// Student Team Overview Page
//
// Shows venture info, team members with milestone progress, mentor contact,
// and check-in history with action items.
// ============================================================================

export default async function StudentTeamPage() {
  // Auth check with impersonation support
  await requireRole("STUDENT", { allowImpersonation: true });
  const { user } = await getEffectiveUser();

  // Find the student's active venture with section info
  const membership = await prisma.teamMembership.findFirst({
    where: {
      userId: user.id,
      isActive: true,
    },
    include: {
      venture: {
        include: {
          section: true,
        },
      },
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

  // Fetch all team members (active students only)
  const teamMembers = await prisma.teamMembership.findMany({
    where: {
      ventureId: venture.id,
      isActive: true,
      user: {
        role: "STUDENT",
      },
    },
    include: {
      user: true,
    },
    orderBy: [{ teamRole: "asc" }, { joinedAt: "asc" }],
  });

  // Get all milestone definitions for this venture
  const applicableMilestones = await prisma.milestoneDefinition.findMany({
    where: {
      ownershipFilter: {
        in: [venture.ownershipType, "BOTH" as any],
      },
      offeringFilter: {
        in: [venture.offeringType, "BOTH" as any],
      },
    },
  });

  // Fetch milestone progress for all team members
  const allProgress = await prisma.milestoneProgress.findMany({
    where: {
      ventureId: venture.id,
      studentId: {
        in: teamMembers.map((m) => m.userId),
      },
    },
  });

  // Fetch mentor assignments for this venture
  const mentors = await prisma.mentorAssignment.findMany({
    where: {
      ventureId: venture.id,
      isActive: true,
    },
    include: {
      user: true,
    },
  });

  // Fetch the last 5 check-ins for this venture
  const checkIns = await prisma.checkIn.findMany({
    where: {
      ventureId: venture.id,
    },
    include: {
      conductedBy: true,
      attendees: {
        include: {
          user: true,
        },
      },
    },
    orderBy: {
      conductedDate: "desc",
    },
    take: 5,
  });

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Your Team</h1>
        <p className="text-gray-600 mt-1">
          Overview of your venture, teammates, and progress
        </p>
      </div>

      {/* Venture Info Card */}
      <VentureCard venture={venture} section={venture.section} />

      {/* Team Members Grid */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">Team Members</h2>
        <TeamMembersGrid
          teamMembers={teamMembers}
          currentUserId={user.id}
          allProgress={allProgress}
          applicableMilestones={applicableMilestones}
        />
      </div>

      {/* Mentor Contact Section */}
      <MentorContactSection mentors={mentors} />

      {/* Check-In History */}
      {checkIns.length > 0 && (
        <CheckInHistorySection checkIns={checkIns} currentUserId={user.id} />
      )}

      {/* Upcoming Action Items (from most recent check-in) */}
      {checkIns.length > 0 && checkIns[0].actionItems && (
        <UpcomingActionItemsSection
          actionItems={checkIns[0].actionItems}
          currentUserId={user.id}
        />
      )}
    </div>
  );
}

// ============================================================================
// Venture Info Card
// ============================================================================

function VentureCard({
  venture,
  section,
}: {
  venture: Venture;
  section: any;
}) {
  const ownershipBadgeColor = {
    SCHOOL: "bg-blue-100 text-blue-800",
    SELF: "bg-purple-100 text-purple-800",
    BOTH: "bg-indigo-100 text-indigo-800",
  }[venture.ownershipType];

  const offeringBadgeColor = {
    PRODUCT: "bg-green-100 text-green-800",
    SERVICE: "bg-orange-100 text-orange-800",
    BOTH: "bg-amber-100 text-amber-800",
  }[venture.offeringType];

  const statusBadgeColor = {
    FORMING: "bg-gray-100 text-gray-800",
    ACTIVE: "bg-emerald-100 text-emerald-800",
    WINDING_DOWN: "bg-yellow-100 text-yellow-800",
    CLOSED: "bg-red-100 text-red-800",
  }[venture.status];

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{venture.name}</h2>
          {venture.description && (
            <p className="text-gray-600 mt-2">{venture.description}</p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge className={ownershipBadgeColor}>
            {venture.ownershipType === "SCHOOL"
              ? "School-based"
              : venture.ownershipType === "SELF"
                ? "Self-owned"
                : "School & Self"}
          </Badge>
          <Badge className={offeringBadgeColor}>
            {venture.offeringType === "PRODUCT"
              ? "Product"
              : venture.offeringType === "SERVICE"
                ? "Service"
                : "Product & Service"}
          </Badge>
          <Badge className={statusBadgeColor}>
            {venture.status === "FORMING"
              ? "Forming"
              : venture.status === "ACTIVE"
                ? "Active"
                : venture.status === "WINDING_DOWN"
                  ? "Winding Down"
                  : "Closed"}
          </Badge>
          {section && (
            <Badge className="bg-slate-100 text-slate-800">
              Period {section.period}
              {section.label ? ` - ${section.label}` : ""}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Team Members Grid
// ============================================================================

function TeamMembersGrid({
  teamMembers,
  currentUserId,
  allProgress,
  applicableMilestones,
}: {
  teamMembers: (TeamMembership & { user: User })[];
  currentUserId: string;
  allProgress: MilestoneProgress[];
  applicableMilestones: any[];
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {teamMembers.map((member) => {
        const isCurrentUser = member.userId === currentUserId;
        const memberProgress = allProgress.filter(
          (p) => p.studentId === member.userId
        );
        const completedCount = memberProgress.filter(
          (p) =>
            p.status === "VERIFIED" ||
            p.status === "SUBMITTED" ||
            p.status === "WAIVED"
        ).length;
        const applicableCount = applicableMilestones.length;

        return (
          <div
            key={member.id}
            className={`rounded-xl border-2 bg-white p-4 ${
              isCurrentUser ? "border-blue-400" : "border-gray-200"
            }`}
          >
            {/* Header with avatar and name */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <Avatar initials={getInitials(member.user.name)} />
                <div className="min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">
                    {member.user.name}
                  </h3>
                  {member.teamRole === "LEAD" && (
                    <p className="text-xs text-blue-600 font-medium">
                      ★ Team Lead
                    </p>
                  )}
                  {member.teamRole === "MEMBER" && (
                    <p className="text-xs text-gray-500">Team Member</p>
                  )}
                </div>
              </div>
              {isCurrentUser && (
                <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800">
                  You
                </span>
              )}
            </div>

            {/* Joined date */}
            <p className="text-xs text-gray-500 mb-3">
              Joined {format(new Date(member.joinedAt), "MMM d, yyyy")}
            </p>

            {/* Progress bar */}
            <div className="space-y-1 mb-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600">Milestones</span>
                <span className="font-semibold text-gray-700">
                  {completedCount}/{applicableCount}
                </span>
              </div>
              <ProgressBar current={completedCount} total={applicableCount} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// Mentor Contact Section
// ============================================================================

function MentorContactSection({
  mentors,
}: {
  mentors: (MentorAssignment & { user: User })[];
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Mentor Contact</h2>

      {mentors.length === 0 ? (
        <p className="text-gray-500 text-sm">No mentor assigned yet</p>
      ) : (
        <div className="space-y-3">
          {mentors.map((assignment) => (
            <div
              key={assignment.id}
              className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 p-3"
            >
              <div className="flex items-center gap-3">
                <Avatar initials={getInitials(assignment.user.name)} />
                <div>
                  <p className="font-medium text-gray-900">
                    {assignment.user.name}
                  </p>
                  <p className="text-sm text-gray-600">{assignment.user.email}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Check-In History Section
// ============================================================================

function CheckInHistorySection({
  checkIns,
  currentUserId,
}: {
  checkIns: (CheckIn & {
    conductedBy: User;
    attendees: any[];
  })[];
  currentUserId: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Check-In History</h2>

      <div className="space-y-4">
        {checkIns.slice(0, 5).map((checkIn) => {
          const wasPresent = checkIn.attendees.some(
            (a) => a.userId === currentUserId && a.wasPresent
          );

          return (
            <div key={checkIn.id} className="border-l-2 border-gray-200 pl-4 pb-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-gray-900">
                    {checkIn.conductedDate
                      ? format(new Date(checkIn.conductedDate), "MMM d, yyyy")
                      : "Scheduled"}
                  </p>
                  <p className="text-sm text-gray-600">
                    Conducted by {checkIn.conductedBy.name}
                  </p>
                  {checkIn.nextCheckInDate && (
                    <p className="text-xs text-blue-600 mt-1">
                      Next check-in: {format(new Date(checkIn.nextCheckInDate), "MMM d, yyyy")}
                    </p>
                  )}
                </div>
                <AttendanceBadge wasPresent={wasPresent} />
              </div>

              {checkIn.notes && (
                <p className="text-sm text-gray-600 mt-2">{checkIn.notes}</p>
              )}

              {checkIn.attendees.length > 0 && (
                <p className="text-xs text-gray-500 mt-2">
                  {checkIn.attendees.filter((a) => a.wasPresent).length} of{" "}
                  {checkIn.attendees.length} attended
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// Upcoming Action Items Section
// ============================================================================

function UpcomingActionItemsSection({
  actionItems,
  currentUserId,
}: {
  actionItems: any[];
  currentUserId: string;
}) {
  if (!Array.isArray(actionItems) || actionItems.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        Upcoming Action Items
      </h2>

      <div className="space-y-3">
        {actionItems.map((item, idx) => {
          const isAssignedToUser = item.assignee === currentUserId;
          const dueDate = item.dueDate ? new Date(item.dueDate) : null;
          const isOverdue =
            dueDate && dueDate < new Date() && !item.completed;

          return (
            <div
              key={idx}
              className={`rounded-lg border p-3 ${
                isAssignedToUser
                  ? "border-blue-200 bg-blue-50"
                  : "border-gray-100 bg-gray-50"
              } ${item.completed ? "opacity-60" : ""}`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={item.completed ?? false}
                  disabled
                  className="mt-1 h-4 w-4 text-blue-600"
                />
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm ${
                      item.completed
                        ? "line-through text-gray-500"
                        : "text-gray-900"
                    }`}
                  >
                    {item.text}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2 items-center text-xs">
                    {isAssignedToUser && (
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 bg-blue-100 text-blue-800 font-medium">
                        Assigned to you
                      </span>
                    )}
                    {dueDate && (
                      <span
                        className={`${
                          isOverdue ? "text-red-600 font-semibold" : "text-gray-600"
                        }`}
                      >
                        Due {format(dueDate, "MMM d, yyyy")}
                        {isOverdue && " (overdue)"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// UI Components
// ============================================================================

function Badge({
  children,
  className,
}: {
  children: React.ReactNode;
  className: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${className}`}
    >
      {children}
    </span>
  );
}

function Avatar({ initials }: { initials: string }) {
  return (
    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-700">
      {initials}
    </div>
  );
}

function ProgressBar({ current, total }: { current: number; total: number }) {
  const percentage = total > 0 ? (current / total) * 100 : 0;
  return (
    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
      <div
        className="h-full bg-green-500 transition-all"
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}

function AttendanceBadge({ wasPresent }: { wasPresent: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
        wasPresent
          ? "bg-green-100 text-green-800"
          : "bg-gray-100 text-gray-800"
      }`}
    >
      {wasPresent ? "✓ Present" : "Absent"}
    </span>
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}
