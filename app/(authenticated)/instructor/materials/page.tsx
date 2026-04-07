import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Semester } from "@prisma/client";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

interface PageProps {
  searchParams: Promise<{ semester?: string }>;
}

const MATERIAL_ICONS: Record<string, string> = {
  READING: "📖",
  SLIDE_DECK: "📊",
  VIDEO: "🎬",
  LINK: "🔗",
  FILE: "📁",
  TEMPLATE: "📋",
};

export default async function MaterialsPage(props: PageProps) {
  const searchParams = await props.searchParams;
  const user = await requireRole("INSTRUCTOR");
  const requestedSemester = (searchParams.semester || "FALL") as Semester;

  // Validate semester parameter
  if (!["FALL", "SPRING"].includes(requestedSemester)) {
    redirect("/instructor/materials?semester=FALL");
  }

  // Fetch active academic year
  const activeYear = await prisma.academicYear.findFirst({
    where: { isActive: true },
  });

  if (!activeYear) {
    return (
      <div>
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Materials</h1>
          <p className="mt-1 text-sm text-gray-500">
            Course materials organized by semester and unit.
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <p className="text-sm text-gray-500">
            No active academic year configured. Please contact your administrator.
          </p>
        </div>
      </div>
    );
  }

  // Fetch semesters for the active year
  const semesters = await prisma.semesterConfig.findMany({
    where: { academicYearId: activeYear.id },
    orderBy: { semester: "asc" },
  });

  if (semesters.length === 0) {
    return (
      <div>
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Materials</h1>
          <p className="mt-1 text-sm text-gray-500">
            Course materials organized by semester and unit.
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <p className="text-sm text-gray-500">
            No semesters configured for the current academic year.
          </p>
        </div>
      </div>
    );
  }

  // Find the selected semester
  const selectedSemester = semesters.find((s) => s.semester === requestedSemester);

  if (!selectedSemester) {
    redirect(`/instructor/materials?semester=${semesters[0].semester}`);
  }

  // Fetch units with materials for the selected semester
  const units = await prisma.unit.findMany({
    where: { semesterConfigId: selectedSemester.id },
    include: {
      materials: {
        orderBy: { sequenceOrder: "asc" },
      },
    },
    orderBy: { sequenceOrder: "asc" },
  });

  return (
    <div>
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Materials</h1>
        <p className="mt-1 text-sm text-gray-500">
          Course materials organized by semester and unit.
        </p>
      </div>

      {/* Semester tabs */}
      <div className="mb-6 flex gap-2 border-b border-gray-200">
        {semesters.map((semester) => (
          <Link
            key={semester.id}
            href={`/instructor/materials?semester=${semester.semester}`}
            className={`px-4 py-3 font-medium text-sm transition-colors ${
              semester.semester === requestedSemester
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {semester.semester === "FALL" ? "Fall Semester" : "Spring Semester"}
          </Link>
        ))}
      </div>

      {/* Add Unit button */}
      <div className="mb-6">
        <Link
          href={`/instructor/materials/new?semesterConfigId=${selectedSemester.id}`}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          + Add Unit
        </Link>
      </div>

      {/* Units list */}
      {units.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-center">
          <p className="text-gray-500">
            No units yet. Create one to get started.
          </p>
        </div>
      ) : (
        <Suspense fallback={<div className="text-center py-8">Loading units...</div>}>
          <UnitsList units={units} semesterConfigId={selectedSemester.id} />
        </Suspense>
      )}
    </div>
  );
}

interface UnitsListProps {
  units: Array<{
    id: string;
    title: string;
    description: string | null;
    isPublished: boolean;
    materials: Array<{
      id: string;
      title: string;
      type: string;
      isPublished: boolean;
    }>;
  }>;
  semesterConfigId: string;
}

async function UnitsList({ units, semesterConfigId }: UnitsListProps) {
  return (
    <div className="space-y-4">
      {units.map((unit) => (
        <UnitCard key={unit.id} unit={unit} semesterConfigId={semesterConfigId} />
      ))}
    </div>
  );
}

interface UnitCardProps {
  unit: {
    id: string;
    title: string;
    description: string | null;
    isPublished: boolean;
    materials: Array<{
      id: string;
      title: string;
      type: string;
      isPublished: boolean;
    }>;
  };
  semesterConfigId: string;
}

function UnitCard({ unit }: UnitCardProps) {
  const publishedCount = unit.materials.filter((m) => m.isPublished).length;
  const totalCount = unit.materials.length;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <Link
              href={`/instructor/materials/${unit.id}`}
              className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors"
            >
              {unit.title}
            </Link>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                unit.isPublished
                  ? "bg-green-100 text-green-800"
                  : "bg-yellow-100 text-yellow-800"
              }`}
            >
              {unit.isPublished ? "Published" : "Draft"}
            </span>
          </div>
          {unit.description && (
            <p className="text-sm text-gray-600">{unit.description}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
        <span>
          {totalCount} material{totalCount !== 1 ? "s" : ""}{" "}
          <span className="text-green-600 font-medium">
            ({publishedCount} published)
          </span>
        </span>
      </div>

      {/* Materials list */}
      {unit.materials.length > 0 && (
        <div className="space-y-2 mb-4 pt-4 border-t border-gray-100">
          {unit.materials.map((material) => (
            <div key={material.id} className="flex items-center gap-2 text-sm">
              <span className="text-base">
                {MATERIAL_ICONS[material.type] || "📄"}
              </span>
              <span className="text-gray-700 flex-1">{material.title}</span>
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                  material.isPublished
                    ? "bg-green-100 text-green-800"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {material.isPublished ? "Published" : "Draft"}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 pt-4 border-t border-gray-100">
        <Link
          href={`/instructor/materials/${unit.id}`}
          className="flex-1 inline-block text-center px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
        >
          Manage Materials
        </Link>
        <Link
          href={`/instructor/materials/${unit.id}/add-material`}
          className="flex-1 inline-block text-center px-3 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
        >
          + Add Material
        </Link>
      </div>
    </div>
  );
}
