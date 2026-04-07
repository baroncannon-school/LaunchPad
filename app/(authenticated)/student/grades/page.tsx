import { requireRole, getEffectiveUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SemesterGradesTab } from "@/components/student/semester-grades-tab";

type GradeCategory =
  | "EXAM"
  | "QUIZ"
  | "MILESTONE_TRACKER"
  | "AUTHENTIC_ASSESSMENT"
  | "FINAL_EXAM"
  | "DESIGN_SHOWCASE";

interface GradeRecord {
  id: string;
  category: GradeCategory;
  label: string | null;
  score: number;
  maxScore: number;
}

export default async function StudentGradesPage() {
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

  // Fetch all grades for this student across both semesters
  const allGrades = await prisma.gradeRecord.findMany({
    where: {
      studentId: user.id,
      semesterConfigId: { in: semesters.map((s) => s.id) },
    },
  });

  // Build maps for client component
  const gradesMap: Record<string, GradeRecord[]> = {};
  const gradeWeightsMap: Record<string, Record<GradeCategory, number>> = {};

  for (const semester of semesters) {
    const semesterId = semester.id;
    gradesMap[semesterId] = allGrades.filter((g) => g.semesterConfigId === semesterId);
    gradeWeightsMap[semesterId] = semester.gradeWeights as Record<GradeCategory, number>;
  }

  // Determine default semester based on current date
  const now = new Date();
  const defaultSemester = semesters.find((s) => {
    return now >= s.startDate && now <= s.endDate;
  }) || semesters[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Grades</h1>
        <p className="text-gray-600 mt-1">
          {activeYear.label} — View your grades by semester
        </p>
      </div>

      {/* Semester Tabs */}
      <SemesterGradesTab
        semesters={semesters.map((s) => ({
          id: s.id,
          semester: s.semester,
          startDate: s.startDate,
          endDate: s.endDate,
        }))}
        gradesMap={gradesMap}
        gradeWeightsMap={gradeWeightsMap}
        defaultSemesterId={defaultSemester.id}
      />
    </div>
  );
}
