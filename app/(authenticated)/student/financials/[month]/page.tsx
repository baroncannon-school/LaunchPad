import { requireRole, getEffectiveUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import FinancialSubmissionForm from "@/components/financials/submission-form";

interface FinancialStatementData {
  id: string;
  ventureId: string;
  month: string;
  status: "NOT_SUBMITTED" | "PENDING_REVIEW" | "REVISION_REQUESTED" | "ACCEPTED";
  fileUrl: string | null;
  feedback: string | null;
  submittedAt: Date | null;
  reviewedAt: Date | null;
  submittedBy: {
    id: string;
    firstName: string;
    lastName: string;
  };
  venture: {
    id: string;
    name: string;
  };
}

interface PageProps {
  params: { month: string };
}

async function getStatementData(
  month: string,
  ventureId: string
): Promise<FinancialStatementData | null> {
  const statement = await prisma.financialStatement.findFirst({
    where: {
      month: month,
      ventureId: ventureId,
    },
    include: {
      submittedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
      venture: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return statement
    ? {
        id: statement.id,
        ventureId: statement.ventureId,
        month: statement.month,
        status: statement.status as any,
        fileUrl: statement.fileUrl,
        feedback: statement.feedback,
        submittedAt: statement.submittedAt,
        reviewedAt: statement.reviewedAt,
        submittedBy: statement.submittedBy,
        venture: statement.venture,
      }
    : null;
}

export default async function StudentFinancialMonthPage({ params }: PageProps) {
  await requireRole("STUDENT", { allowImpersonation: true });
  const { user } = await getEffectiveUser();

  const { month } = params;

  // Get student's venture
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
      <div className="space-y-4">
        <Link
          href="/student/financials"
          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
        >
          ← Back to Financials
        </Link>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
          <h2 className="text-lg font-semibold text-amber-900">
            No Venture Assigned
          </h2>
          <p className="text-sm text-amber-800 mt-2">
            You're not currently assigned to a venture. Contact your instructor
            to get started.
          </p>
        </div>
      </div>
    );
  }

  const venture = membership.venture;
  const statement = await getStatementData(month, venture.id);

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

  const currentStatus = statement?.status || "NOT_SUBMITTED";
  const isSubmitted = statement && currentStatus !== "NOT_SUBMITTED";
  const needsRevision = currentStatus === "REVISION_REQUESTED";
  const isAccepted = currentStatus === "ACCEPTED";

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Link
        href="/student/financials"
        className="text-blue-600 hover:text-blue-700 text-sm font-medium inline-block"
      >
        ← Financials
      </Link>

      {/* Header */}
      <div>
        <div className="flex items-center gap-4 mb-2">
          <h1 className="text-3xl font-bold text-gray-900">
            {formatMonthDisplay(month)}
          </h1>
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeColor(currentStatus)}`}
          >
            {currentStatus === "ACCEPTED"
              ? "Accepted"
              : currentStatus === "PENDING_REVIEW"
                ? "Pending Review"
                : currentStatus === "REVISION_REQUESTED"
                  ? "Revision Requested"
                  : "Not Submitted"}
          </span>
        </div>
        <p className="text-gray-600">{venture.name}</p>
      </div>

      {/* Status Card */}
      {isSubmitted && (
        <div
          className={`rounded-xl border ${getStatusColor(currentStatus)} p-6`}
        >
          <div className="space-y-3">
            {statement.submittedAt && (
              <div>
                <p className="text-sm font-medium text-gray-700">
                  Submitted on
                </p>
                <p className="text-gray-900">
                  {new Date(statement.submittedAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            )}

            {statement.fileUrl && (
              <div>
                <p className="text-sm font-medium text-gray-700">File</p>
                <a
                  href={statement.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700 font-medium break-all"
                >
                  {statement.fileUrl}
                </a>
              </div>
            )}

            {needsRevision && statement.feedback && (
              <div className="border-t border-current border-opacity-20 pt-3">
                <p className="text-sm font-medium text-red-800 mb-2">
                  Feedback for Revision
                </p>
                <p className="text-gray-800 text-sm leading-relaxed">
                  {statement.feedback}
                </p>
              </div>
            )}

            {isAccepted && (
              <div className="border-t border-current border-opacity-20 pt-3">
                <p className="text-sm font-medium text-green-800">
                  This statement has been approved.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Submission Form - shown if not submitted or revision requested */}
      {!isSubmitted || needsRevision ? (
        <FinancialSubmissionForm month={month} ventureId={venture.id} />
      ) : null}

      {/* Accepted State */}
      {isAccepted && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-6">
          <div className="flex items-start gap-3">
            <div className="text-green-600 text-2xl">✓</div>
            <div>
              <h3 className="font-semibold text-green-900">
                Financial statement accepted
              </h3>
              <p className="text-green-800 text-sm mt-1">
                Your {formatMonthDisplay(month)} financial statement has been
                reviewed and accepted by your instructor.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
