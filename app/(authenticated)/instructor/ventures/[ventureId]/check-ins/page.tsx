import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";

interface ActionItem {
  text: string;
  assignee: string;
  dueDate: string;
  completed: boolean;
}

export default async function CheckInsPage({
  params,
}: {
  params: Promise<{ ventureId: string }>;
}) {
  const user = await requireRole("INSTRUCTOR");
  const { ventureId } = await params;

  // Fetch venture
  const venture = await prisma.venture.findUnique({
    where: { id: ventureId },
  });

  if (!venture) notFound();

  // Fetch all check-ins with related data
  const checkIns = await prisma.checkIn.findMany({
    where: { ventureId },
    include: {
      conductedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      attendees: {
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
    },
    orderBy: { conductedDate: "desc" },
  });

  // Helper function to format date
  const formatDate = (date: Date | null) => {
    if (!date) return "Not conducted";
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Helper function to get action items count
  const getActionItemsCount = (actionItems: unknown) => {
    if (!actionItems || !Array.isArray(actionItems)) return 0;
    return actionItems.length;
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/instructor/ventures" className="hover:text-gray-700">
          Ventures
        </Link>
        <span>/</span>
        <Link
          href={`/instructor/ventures/${ventureId}`}
          className="hover:text-gray-700"
        >
          {venture.name}
        </Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">Check-ins</span>
      </nav>

      {/* Header with new check-in button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Check-in History</h1>
          <p className="mt-1 text-sm text-gray-600">
            {venture.name}
          </p>
        </div>
        <Link
          href={`/instructor/ventures/${ventureId}/check-ins/new`}
          className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
        >
          + Conduct New Check-in
        </Link>
      </div>

      {/* Check-ins List */}
      {checkIns.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <div className="text-gray-400 mb-2">
            <svg
              className="w-12 h-12 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            No check-ins yet
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Start tracking progress by conducting your first check-in with this
            venture.
          </p>
          <Link
            href={`/instructor/ventures/${ventureId}/check-ins/new`}
            className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            Conduct First Check-in
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {checkIns.map((checkIn) => (
            <details
              key={checkIn.id}
              className="rounded-xl border border-gray-200 bg-white overflow-hidden group"
            >
              <summary className="cursor-pointer select-none p-6 hover:bg-gray-50 transition-colors flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-2">
                    <span className="text-sm font-semibold text-gray-900">
                      {formatDate(checkIn.conductedDate)}
                    </span>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full">
                      {checkIn.attendees.length} attendees
                    </span>
                    {getActionItemsCount(checkIn.actionItems) > 0 && (
                      <span className="text-xs bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full">
                        {getActionItemsCount(checkIn.actionItems)} action items
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-1">
                    Conducted by {checkIn.conductedBy.firstName}{" "}
                    {checkIn.conductedBy.lastName}
                  </p>
                  {checkIn.notes && (
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {checkIn.notes}
                    </p>
                  )}
                </div>
                <svg
                  className="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform ml-4 flex-shrink-0 mt-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 14l-7 7m0 0l-7-7m7 7V3"
                  />
                </svg>
              </summary>

              {/* Expanded Content */}
              <div className="border-t border-gray-100 px-6 py-4 bg-gray-50 space-y-6">
                {/* Full Notes */}
                {checkIn.notes && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">
                      Notes
                    </h4>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {checkIn.notes}
                    </p>
                  </div>
                )}

                {/* Attendance */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">
                    Attendance
                  </h4>
                  <div className="grid gap-2">
                    {checkIn.attendees.map((attendee) => (
                      <div
                        key={attendee.id}
                        className="flex items-center gap-2 text-sm"
                      >
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            attendee.wasPresent
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {attendee.wasPresent ? "Present" : "Absent"}
                        </span>
                        <span className="text-gray-900">
                          {attendee.user.firstName} {attendee.user.lastName}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Items */}
                {Array.isArray(checkIn.actionItems) &&
                  checkIn.actionItems.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-2">
                        Action Items
                      </h4>
                      <div className="space-y-2">
                        {(
                          checkIn.actionItems as ActionItem[]
                        ).map((item, idx) => (
                          <div
                            key={idx}
                            className="rounded-lg border border-gray-200 p-3 bg-white"
                          >
                            <div className="flex items-start gap-2">
                              <input
                                type="checkbox"
                                checked={item.completed}
                                disabled
                                className="mt-1 w-4 h-4 text-blue-600 rounded cursor-not-allowed"
                              />
                              <div className="flex-1 min-w-0">
                                <p
                                  className={`text-sm font-medium ${
                                    item.completed
                                      ? "text-gray-500 line-through"
                                      : "text-gray-900"
                                  }`}
                                >
                                  {item.text}
                                </p>
                                <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-600">
                                  {item.assignee && (
                                    <span>
                                      Assigned: {item.assignee}
                                    </span>
                                  )}
                                  {item.dueDate && (
                                    <span>
                                      Due:{" "}
                                      {new Date(
                                        item.dueDate
                                      ).toLocaleDateString()}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                {/* Next Check-in Date */}
                {checkIn.nextCheckInDate && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">
                      Next Check-in Scheduled
                    </h4>
                    <p className="text-sm text-gray-700">
                      {formatDate(checkIn.nextCheckInDate)}
                    </p>
                  </div>
                )}
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
