import { requireRole, getEffectiveUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MaterialsViewer } from "@/components/student/materials-viewer";

interface Unit {
  id: string;
  title: string;
  description: string | null;
  sequenceOrder: number;
}

interface Material {
  id: string;
  unitId: string;
  title: string;
  description: string | null;
  type:
    | "READING"
    | "SLIDE_DECK"
    | "VIDEO"
    | "LINK"
    | "FILE"
    | "TEMPLATE";
  url: string | null;
  filePath: string | null;
  sequenceOrder: number;
}

interface MaterialsByUnit {
  unit: Unit;
  materials: Material[];
}

export default async function StudentMaterialsPage() {
  await requireRole("STUDENT", { allowImpersonation: true });
  const { user } = await getEffectiveUser();

  // Get active academic year
  const activeYear = await prisma.academicYear.findFirst({
    where: { isActive: true },
  });

  if (!activeYear) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
        <h2 className="text-lg font-semibold text-amber-900">No Academic Year</h2>
        <p className="text-sm text-amber-800 mt-2">
          No active academic year is configured. Contact your instructor.
        </p>
      </div>
    );
  }

  // Get both semesters for this academic year
  const semesters = await prisma.semesterConfig.findMany({
    where: { academicYearId: activeYear.id },
    orderBy: { semester: "asc" },
  });

  if (semesters.length === 0) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
        <h2 className="text-lg font-semibold text-amber-900">No Semesters</h2>
        <p className="text-sm text-amber-800 mt-2">
          No semesters are configured for this academic year. Contact your instructor.
        </p>
      </div>
    );
  }

  // Determine current semester based on current date
  const now = new Date();
  const currentSemester = semesters.find((s) => {
    return now >= s.startDate && now <= s.endDate;
  }) || semesters[0];

  // Fetch all semesters with their published units and materials
  const semesterData = await Promise.all(
    semesters.map(async (semester) => {
      const units = await prisma.unit.findMany({
        where: {
          semesterConfigId: semester.id,
          isPublished: true,
        },
        orderBy: { sequenceOrder: "asc" },
      });

      const unitIds = units.map((u) => u.id);

      const materials = await prisma.material.findMany({
        where: {
          unitId: { in: unitIds },
          isPublished: true,
        },
        orderBy: [{ unitId: "asc" }, { sequenceOrder: "asc" }],
      });

      const materialsByUnit: MaterialsByUnit[] = units.map((unit) => ({
        unit: {
          id: unit.id,
          title: unit.title,
          description: unit.description,
          sequenceOrder: unit.sequenceOrder,
        },
        materials: materials.filter((m) => m.unitId === unit.id),
      }));

      return {
        semesterId: semester.id,
        semester: semester.semester,
        materialsByUnit,
      };
    })
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Course Materials</h1>
        <p className="text-gray-600 mt-1">
          {activeYear.label} — Readings, slides, videos, and other resources
        </p>
      </div>

      {/* Materials Viewer with Semester Tabs */}
      <MaterialsViewer
        semesters={semesterData.map((data) => ({
          id: data.semesterId,
          semester: data.semester,
        }))}
        semesterMaterials={semesterData}
        defaultSemesterId={currentSemester.id}
      />
    </div>
  );
}
