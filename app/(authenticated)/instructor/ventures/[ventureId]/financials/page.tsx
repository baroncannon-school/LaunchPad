import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import FinancialReviewActions from "@/components/financials/review-actions";

interface PageProps {
  params: { ventureId: string };
}

export default async function InstructorVentureFinancialsPage({
  params,
}: PageProps) {
  await requireRole("INSTRUCTOR");

  const { ventureId } = params;

  // Fetch venture with financial statements
  const venture = await prisma.venture.findUnique({
    where: { id: ventureId },
    include: {
      section: true,
      financialStatements: {
        include: {
          submittedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy: { month: "asc" },
      },
    },
  });

  if (!venture) {
    return (
      <div className="space-y-4">
        <Link
          href="/instructor/ventures"
          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
        >
          ← Back to Ventures
        </Link>
        <div className="rounded-xl border border-red-200 bg-red-50 p-6">
          <h2 className="text-lg font-semibold text-red-900">Venture not found</h2>
          <p className="text-sm text-red-800 mt-2">
            The venture you're looking for doesn't exist or has been removed.
          </p>
        </div>
      </div>
    );
  }

  // Define expected months: Nov through May (academic year)
  const expectedMonths = [
    "2025-11",
    "2025-12",
    "2026-01",
    "2026-02",
    "2026-03",
    "2026-04",
    "2026-05",
  ];

  // Create a map of month -> financial statement
  const statementMap = new Map(
    venture.financialStatements.map((stmt) => [stmt.month, stmt])
  );

  // Build the months list with status
  const monthsWithStatements = expectedMonths.map((month) => {
    const statement = statementMap.get(month);
    return {
      month,
      statement: statement || null,
    };
  });

  const formatMonthDisplay = (monthStr: string): string => {
    const [year, monthNum] = monthStr.split("-");
    const date = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
    return date.toLocaleDateString("en-US", { year: "numeric", month: "long" });
  };

  const getStatusColor = (status: string) => {
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

  const getStatusBadgeColor = (status: string) => {
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

  const getStatusLabel = (status: string) => {
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

  // Count stats
  const acceptedCount = monthsWithStatements.filter(
    (m) => m.statement?.status === "ACCEPTED"
  ).length;
  const pendingCount = monthsWithStatements.filter(
    (m) => m.statement?.status === "PENDING_REVIEW"
  ).length;
  const revisionCount = monthsWithStatements.filter(
    (m) => m.statement?.status === "REVISION_REQUESTED"
  ).length;
  const notSubmittedCount = monthsWithStatements.filter(
    (m) => !m.statement || m.statement.status === "NOT_SUBMITTED"
  ).length;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Link
        href="/instructor/ventures"
        className="text-blue-600 hover:text-blue-700 text-sm font-medium inline-block"
      >
        ← Ventures
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Financial Statements</h1>
        <p className="text-gray-600 mt-1">{venture.name}</p>
      </div>

      {/* Overview Card */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Summary</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{acceptedCount}</p>
            <p className="text-sm text-gray-600 mt-1">Accepted</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
            <p className="text-sm text-gray-600 mt-1">Pending</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-red-600">{revisionCount}</p>
            <p className="text-sm text-gray-600 mt-1">Revision Needed</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-600">
              {notSubmittedCount}
            </p>
            <p className="text-sm text-gray-600 mt-1">Not Submitted</p>
          </div>
        </div>
      </div>

      {/* Month Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {monthsWithStatements.map(({ month, statement }) => {
          const status = statement?.status || "NOT_SUBMITTED";
          const isSubmitted = statement !== null;

          return (
            <div
              key={month}
              className={`rounded-xl border ${getStatusColor(status)} p-6`}
            >
              {/* Month Header */}
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {formatMonthDisplay(month)}
                </h3>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(status)}`}
                >
                  {getStatusLabel(status)}
                </span>
              </div>

              {/* Submission Details */}
              {isSubmitted ? (
                <div className="space-y-3 border-t border-current border-opacity-10 pt-4">
                  {statement.submittedBy && (
                    <div>
                      <p className="text-xs font-medium text-gray-700">
                        Submitted By
                      </p>
                      <p className="text-sm text-gray-900">
                        {statement.submittedBy.firstName}{" "}
                        {statement.submittedBy.lastName}
                      </p>
                    </div>
                  )}

                  {statement.submittedAt && (
                    <div>
                      <p className="text-xs font-medium text-gray-700">
                        Submitted On
                      </p>
                      <p className="text-sm text-gray-900">
                        {new Date(statement.submittedAt).toLocaleDateString(
                          "en-US",
                          {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )}
                      </p>
                    </div>
                  )}

                  {statement.fileUrl && (
                    <div>
                      <p className="text-xs font-medium text-gray-700">File</p>
                      <a
                        href={statement.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-700 break-all"
                      >
                        {statement.fileUrl}
                      </a>
                    </div>
                  )}

                  {statement.feedback && (
                    <div>
                      <p className="text-xs font-medium text-gray-700">
                        Feedback
                      </p>
                      <p className="text-sm text-gray-900 mt-1 bg-white bg-opacity-50 rounded p-2">
                        {statement.feedback}
                      </p>
                    </div>
                  )}

                  {statement.reviewedAt && (
                    <div>
                      <p className="text-xs font-medium text-gray-700">
                        Reviewed On
                      </p>
                      <p className="text-sm text-gray-900">
                        {new Date(statement.reviewedAt).toLocaleDateString(
                          "en-US",
                          {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )}
                      </p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  {status === "PENDING_REVIEW" && (
                    <FinancialReviewActions statementId={statement.id} />
                  )}

                  {status === "REVISION_REQUESTED" && (
                    <FinancialReviewActions
                      statementId={statement.id}
                      isRevision={true}
                    />
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-600 border-t border-current border-opacity-10 pt-4">
                  No submission for this month
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
