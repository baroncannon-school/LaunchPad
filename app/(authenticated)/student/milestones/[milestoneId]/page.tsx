import { requireRole, getEffectiveUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";

type MilestoneStatus = "NOT_STARTED" | "IN_PROGRESS" | "SUBMITTED" | "VERIFIED" | "WAIVED";

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

function formatDate(date: Date | null | undefined): string {
  if (!date) return "Not yet";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getEvidenceTypeLabel(type: string): string {
  switch (type) {
    case "FILE":
      return "File upload";
    case "LINK":
      return "External link";
    case "TEXT":
      return "Text description";
    case "NONE":
      return "No evidence needed";
    default:
      return type;
  }
}

interface PageProps {
  params: Promise<{ milestoneId: string }>;
}

export default async function MilestoneDetailPage(props: PageProps) {
  const params = await props.params;
  const { milestoneId } = params;

  await requireRole("STUDENT", { allowImpersonation: true });
  const { user, isImpersonating } = await getEffectiveUser();

  // Fetch the milestone definition
  const milestone = await prisma.milestoneDefinition.findUnique({
    where: { id: milestoneId },
  });

  if (!milestone) {
    notFound();
  }

  // Fetch student's venture and progress
  const membership = await prisma.teamMembership.findFirst({
    where: { userId: user.id, isActive: true },
    include: { venture: true },
  });

  if (!membership) {
    notFound();
  }

  const progress = await prisma.milestoneProgress.findFirst({
    where: {
      studentId: user.id,
      milestoneDefinitionId: milestoneId,
    },
  });

  // Fetch related materials if any
  const relatedMaterials = milestone.relatedMaterialIds.length > 0
    ? await prisma.material.findMany({
        where: { id: { in: milestone.relatedMaterialIds } },
        include: { unit: true },
      })
    : [];

  const status = (progress?.status ?? "NOT_STARTED") as MilestoneStatus;
  const completed = status === "VERIFIED" || status === "SUBMITTED";

  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-2">
        <Link
          href="/student/milestones"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Milestones
        </Link>
        <span className="text-gray-400">/</span>
        <span className="text-sm font-medium text-gray-900 line-clamp-1">
          {milestone.title}
        </span>
      </div>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {milestone.title}
            </h1>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium bg-gray-100 text-gray-700">
                {milestone.period}
              </span>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                  milestone.requirementLevel === "REQUIRED"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                {milestone.requirementLevel === "REQUIRED" ? "Required" : "Optional"}
              </span>
              {milestone.phaseLabel && (
                <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium bg-indigo-100 text-indigo-700">
                  {milestone.phaseLabel}
                </span>
              )}
            </div>
          </div>
          <div className="flex-shrink-0">
            <span
              className={`inline-flex items-center rounded-full px-3 py-1.5 text-sm font-semibold ${getStatusBadgeColor(
                status
              )}`}
            >
              {getStatusLabel(status)}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Description */}
        {milestone.description && (
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Description</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              {milestone.description}
            </p>
          </div>
        )}

        {/* Guidance */}
        {milestone.guidanceText && (
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-6">
            <h2 className="text-lg font-semibold text-blue-900 mb-3">
              Guidance & Tips
            </h2>
            <p className="text-sm text-blue-800 leading-relaxed">
              {milestone.guidanceText}
            </p>
          </div>
        )}

        {/* Status Timeline */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Timeline</h2>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-24">
                <p className="text-sm font-medium text-gray-700">Started</p>
              </div>
              <p className="text-sm text-gray-600">
                {formatDate(progress?.startedAt)}
              </p>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-24">
                <p className="text-sm font-medium text-gray-700">Submitted</p>
              </div>
              <p className="text-sm text-gray-600">
                {formatDate(progress?.submittedAt)}
              </p>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-24">
                <p className="text-sm font-medium text-gray-700">Verified</p>
              </div>
              <p className="text-sm text-gray-600">
                {formatDate(progress?.verifiedAt)}
              </p>
            </div>
          </div>
        </div>

        {/* Evidence Requirements */}
        {milestone.evidenceRequired && (
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              Evidence Required
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              {getEvidenceTypeLabel(milestone.evidenceType)}
            </p>

            {/* Evidence display based on type */}
            {progress?.evidenceUrl && milestone.evidenceType === "LINK" && (
              <div className="mb-4">
                <p className="text-xs font-medium text-gray-700 mb-2">
                  Submitted Link
                </p>
                <a
                  href={progress.evidenceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline break-all"
                >
                  {progress.evidenceUrl}
                </a>
              </div>
            )}

            {progress?.evidenceText && milestone.evidenceType === "TEXT" && (
              <div className="mb-4">
                <p className="text-xs font-medium text-gray-700 mb-2">
                  Submitted Text
                </p>
                <p className="text-sm text-gray-600 bg-gray-50 rounded p-3 whitespace-pre-wrap">
                  {progress.evidenceText}
                </p>
              </div>
            )}

            {progress?.evidenceFiles && progress.evidenceFiles.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-medium text-gray-700 mb-2">
                  Submitted Files
                </p>
                <ul className="space-y-1">
                  {progress.evidenceFiles.map((file, idx) => (
                    <li key={idx} className="text-sm text-gray-600">
                      {file}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {!progress?.evidenceUrl &&
              !progress?.evidenceText &&
              (!progress?.evidenceFiles || progress.evidenceFiles.length === 0) && (
                <p className="text-sm text-gray-500 italic">
                  No evidence submitted yet
                </p>
              )}
          </div>
        )}

        {/* Student Notes */}
        {progress?.studentNotes && (
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              Your Notes
            </h2>
            <p className="text-sm text-gray-600 bg-gray-50 rounded p-3 whitespace-pre-wrap">
              {progress.studentNotes}
            </p>
          </div>
        )}

        {/* Instructor Notes */}
        {progress?.instructorNotes && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
            <h2 className="text-lg font-semibold text-amber-900 mb-3">
              Instructor Feedback
            </h2>
            <p className="text-sm text-amber-800 bg-white rounded p-3 whitespace-pre-wrap border border-amber-100">
              {progress.instructorNotes}
            </p>
          </div>
        )}

        {/* Related Materials */}
        {relatedMaterials.length > 0 && (
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Related Materials
            </h2>
            <div className="space-y-3">
              {relatedMaterials.map((material) => (
                <a
                  key={material.id}
                  href={material.url || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-3 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all"
                >
                  <p className="text-sm font-medium text-gray-900">
                    {material.title}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {material.unit?.title}
                  </p>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
