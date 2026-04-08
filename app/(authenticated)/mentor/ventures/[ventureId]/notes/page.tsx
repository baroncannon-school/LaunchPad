import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { NotesForm } from "./notes-form";

// Simple date formatting utility
const formatDate = (date: Date, formatStr: string = "MMM d, yyyy"): string => {
  const d = new Date(date);
  const month = d.toLocaleString("en-US", { month: "short" });
  const monthFull = d.toLocaleString("en-US", { month: "long" });
  const day = d.getDate();
  const year = d.getFullYear();
  const mins = String(d.getMinutes()).padStart(2, "0");
  const ampm = d.getHours() >= 12 ? "PM" : "AM";
  const hour12 = d.getHours() % 12 || 12;

  if (formatStr === "MMMM d, yyyy 'at' h:mm a") {
    return `${monthFull} ${day}, ${year} at ${hour12}:${mins} ${ampm}`;
  }
  if (formatStr === "MMM d, yyyy") {
    return `${month} ${day}, ${year}`;
  }
  return d.toLocaleDateString();
};

export default async function NotesPage({
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
  });

  if (!venture) {
    notFound();
  }

  // ============================================================================
  // Fetch all check-ins conducted by THIS mentor for this venture
  // ============================================================================
  const checkIns = await prisma.checkIn.findMany({
    where: {
      ventureId,
      conductedById: user.id,
    },
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
        <Link
          href={`/mentor/ventures/${ventureId}`}
          className="hover:text-gray-700"
        >
          {venture.name}
        </Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">Notes</span>
      </nav>

      {/* Page Header */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h1 className="text-2xl font-bold text-gray-900">My Notes</h1>
        <p className="mt-2 text-sm text-gray-600">
          View check-in notes and action items from your mentoring sessions with{" "}
          {venture.name}.
        </p>
      </div>

      {/* Add Note Form */}
      <NotesForm ventureId={ventureId} ventureName={venture.name} />

      {/* Notes History */}
      <div>
        <h2 className="mb-4 text-lg font-bold text-gray-900">Notes History</h2>
        {checkIns.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-6 text-center">
            <p className="text-sm text-gray-500">
              No notes yet. Start by adding a note above or conducting a check-in.
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
                    <p className="text-xs text-gray-500 font-medium">
                      {formatDate(
                        new Date(checkIn.conductedDate || checkIn.createdAt),
                        "MMMM d, yyyy 'at' h:mm a"
                      )}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1">
                      <span className="text-xs font-medium text-blue-700">
                        {checkIn.attendees.length} attendees
                      </span>
                    </div>
                  </div>
                </div>

                {/* Attendees */}
                {checkIn.attendees.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs text-gray-600 font-medium mb-2">
                      Attendees:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {checkIn.attendees.map((attendee: any) => (
                        <span
                          key={attendee.userId}
                          className="inline-flex items-center rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-700"
                        >
                          {attendee.user.firstName} {attendee.user.lastName}
                          {!attendee.wasPresent && (
                            <span className="ml-1 opacity-60">(absent)</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {checkIn.notes && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
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
                                {item.dueDate && (
                                  <p className="text-xs text-gray-500 mt-0.5">
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
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
