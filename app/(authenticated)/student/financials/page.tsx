import { requireRole, getEffectiveUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

type FinancialStatementStatus =
  | "NOT_SUBMITTED"
  | "PENDING_REVIEW"
  | "REVISION_REQUESTED"
  | "ACCEPTED";

interface FinancialStatement {
  month: string;
  status: FinancialStatementStatus;
  submittedAt: Date | null;
  reviewedAt: Date | null;
  feedback: string | null;
}

export default async function StudentFinancialsPage() {
  await requireRole("STUDENT", { allowImpersonation: true });
  const { user } = await getEffectiveUser();

  // Get student's venture via TeamMembership
  const membership = await prisma.teamMembership.findFirst({
    where: {
      userId: user.id,
      isActive: true,
    },
    include: {
      venture: {
        include: {
          academicYear: true,
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

  // Define expected months: Nov 2025 through May 2026 (typical academic year)
  const expectedMonths = [
    "2025-11",
    "2025-12",
    "2026-01",
    "2026-02",
    "2026-03",
    "2026-04",
    "2026-05",
  ];

  // Fetch financial statements for this venture
  const financialStatements = await prisma.financialStatement.findMany({
    where: {
      ventureId: venture.id,
    },
  });

  // Create a map of month -> financial statement
  const statementMap = new Map<string, FinancialStatement>();
  for (const stmt of financialStatements) {
    statementMap.set(stmt.month, {
      month: stmt.month,
      status: stmt.status,
      submittedAt: stmt.submittedAt,
      reviewedAt: stmt.reviewedAt,
      feedback: stmt.feedback,
    });
  }

  // Build the months list with status
  const monthsWithStatus = expectedMonths.map((month) => {
    const statement = statementMap.get(month);
    return {
      month,
      status: statement?.status || "NOT_SUBMITTED",
      submittedAt: statement?.submittedAt,
      reviewedAt: statement?.reviewedAt,
      feedback: statement?.feedback,
    };
  });

  const getStatusColor = (status: FinancialStatementStatus) => {
    switch (status) {
      case "ACCEPTED":
        return "bg-green-50 border-green-200";
      case "PENDING_REVIEW":
        return "bg-amber-50 border-amber-200";
      case "REVISION_REQUESTED":
        return "bg-red-50 border-red-200";
      case "NOT_SUBMITTED":
      default:
        return "bg-gray-50 border-gray-200";
    }
  };

  const getStatusBadgeColor = (status: FinancialStatementStatus) => {
    switch (status) {
      case "ACCEPTED":
        return "bg-green-100 text-green-800";
      case "PENDING_REVIEW":
        return "bg-amber-100 text-amber-800";
      case "REVISION_REQUESTED":
        return "bg-red-100 text-red-800";
      case "NOT_SUBMITTED":
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: FinancialStatementStatus) => {
    switch (status) {
      case "ACCEPTED":
        return "Accepted";
      case "PENDING_REVIEW":
        return "Pending Review";
      case "REVISION_REQUESTED":
        return "Revision Requested";
      case "NOT_SUBMITTED":
      default:
        return "Not Submitted";
    }
  };

  const formatMonthDisplay = (month: string): string => {
    const [year, monthNum] = month.split("-");
    const date = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
    return date.toLocaleDateString("en-US", { year: "numeric", month: "long" });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Financial Statements</h1>
        <p className="text-gray-600 mt-1">
          {venture.name} — Monthly financial submissions
        </p>
      </div>

      {/* Overview Card */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          Submission Status
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">
              {monthsWithStatus.filter((m) => m.status === "ACCEPTED").length}
            </p>
            <p className="text-sm text-gray-600 mt-1">Accepted</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-amber-600">
              {monthsWithStatus.filter((m) => m.status === "PENDING_REVIEW").length}
            </p>
            <p className="text-sm text-gray-600 mt-1">Pending</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-red-600">
              {monthsWithStatus.filter((m) => m.status === "REVISION_REQUESTED").length}
            </p>
            <p className="text-sm text-gray-600 mt-1">Revision Needed</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-600">
              {monthsWithStatus.filter((m) => m.status === "NOT_SUBMITTED").length}
            </p>
            <p className="text-sm text-gray-600 mt-1">Not Submitted</p>
          </div>
        </div>
      </div>

      {/* Month Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {monthsWithStatus.map((item) => (
          <Link
            key={item.month}
            href={`/student/financials/${item.month}`}
            className="group"
          >
            <div
              className={`rounded-xl border ${getStatusColor(item.status as FinancialStatementStatus)} p-4 transition-all hover:shadow-md`}
            >
              {/* Month Header */}
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                  {formatMonthDisplay(item.month)}
                </h3>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(item.status as FinancialStatementStatus)}`}
                >
                  {getStatusLabel(item.status as FinancialStatementStatus)}
                </span>
              </div>

              {/* Submission Details */}
              {item.status === "NOT_SUBMITTED" ? (
                <p className="text-sm text-gray-600">Not yet submitted</p>
              ) : (
                <div className="space-y-2">
                  {item.submittedAt && (
                    <div className="text-xs text-gray-600">
                      <p className="font-medium">Submitted:</p>
                      <p>
                        {new Date(item.submittedAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                  )}
                  {item.feedback && (
                    <div className="text-xs text-gray-700 bg-white bg-opacity-50 rounded p-2 mt-2">
                      <p className="font-medium mb-1">Feedback:</p>
                      <p className="line-clamp-2">{item.feedback}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Click to Open Link */}
              <div className="mt-4 pt-4 border-t border-current border-opacity-10">
                <p className="text-xs text-blue-600 group-hover:text-blue-700 font-medium">
                  {item.status === "NOT_SUBMITTED" ? "Upload" : "View"}
                  <span className="ml-1">→</span>
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Info Footer */}
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
        <p className="text-sm text-gray-700">
          <span className="font-medium">Note:</span> Financial statements are required for each month of the academic year. Click on any month to upload or review your submission.
        </p>
      </div>
    </div>
  );
}
