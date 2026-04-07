import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GradeCell } from "@/components/gradebook/grade-cell";
import Link from "next/link";

interface GradeRecord {
  id: string;
  studentId: string;
  semesterConfigId: string;
  category: string;
  label: string | null;
  score: number;
  maxScore: number;
}

interface StudentWithGrades {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  gradeRecords: GradeRecord[];
}

const GRADE_CATEGORIES = [
  "EXAM",
  "QUIZ",
  "MILESTONE_TRACKER",
  "AUTHENTIC_ASSESSMENT",
  "FINAL_EXAM",
  "DESIGN_SHOWCASE",
] as const;

function getGradeColor(percentage: number): string {
  if (percentage >= 90) return "bg-green-50 text-green-700";
  if (percentage >= 80) return "bg-blue-50 text-blue-700";
  if (percentage >= 70) return "bg-amber-50 text-amber-700";
  if (percentage >= 60) return "bg-orange-50 text-orange-700";
  return "bg-red-50 text-red-700";
}

function calculateWeightedGrade(
  studentRecords: GradeRecord[],
  gradeWeights: Record<string, number>
): { percentage: number; grade: string } {
  // Group records by category and calculate average for each
  const categoryAverages: Record<string, number> = {};

  for (const category of GRADE_CATEGORIES) {
    const recordsInCategory = studentRecords.filter(
      (r) => r.category === category
    );
    if (recordsInCategory.length > 0) {
      const totalScore = recordsInCategory.reduce((sum, r) => sum + r.score, 0);
      const totalMax = recordsInCategory.reduce((sum, r) => sum + r.maxScore, 0);
      categoryAverages[category] = totalMax > 0 ? (totalScore / totalMax) * 100 : 0;
    }
  }

  // Apply weights
  let weightedSum = 0;
  let totalWeight = 0;
  for (const category of GRADE_CATEGORIES) {
    const weight = gradeWeights[category] || 0;
    if (weight > 0 && categoryAverages[category] !== undefined) {
      weightedSum += categoryAverages[category] * weight;
      totalWeight += weight;
    }
  }

  const percentage =
    totalWeight > 0 ? weightedSum / totalWeight : 0;

  let grade = "F";
  if (percentage >= 90) grade = "A";
  else if (percentage >= 80) grade = "B";
  else if (percentage >= 70) grade = "C";
  else if (percentage >= 60) grade = "D";

  return { percentage, grade };
}

function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    EXAM: "Exam",
    QUIZ: "Quiz",
    MILESTONE_TRACKER: "Milestone Tracker",
    AUTHENTIC_ASSESSMENT: "Authentic Assessment",
    FINAL_EXAM: "Final Exam",
    DESIGN_SHOWCASE: "Design Showcase",
  };
  return labels[category] || category;
}

export default async function GradebookPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  await requireRole("INSTRUCTOR");

  const params = await searchParams;
  const selectedSemesterId = params.semester;
  const selectedSectionId = params.section;

  // Fetch active academic year
  const activeYear = await prisma.academicYear.findFirst({
    where: { isActive: true },
    include: {
      semesters: {
        orderBy: { semester: "asc" },
      },
      sections: {
        orderBy: { period: "asc" },
      },
    },
  });

  if (!activeYear) {
    return (
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Gradebook</h1>
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-6">
          <p className="text-gray-500">
            No active academic year configured. Please contact your administrator.
          </p>
        </div>
      </div>
    );
  }

  // Default to first semester and section if not specified
  const defaultSemester = activeYear.semesters[0];
  const defaultSection = activeYear.sections[0];
  const semesterId = selectedSemesterId || defaultSemester?.id;
  const sectionId = selectedSectionId || defaultSection?.id;

  if (!semesterId || !sectionId) {
    return (
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Gradebook</h1>
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-6">
          <p className="text-gray-500">
            No semesters or sections configured for the active year.
          </p>
        </div>
      </div>
    );
  }

  // Fetch semester config for weights
  const semesterConfig = await prisma.semesterConfig.findUnique({
    where: { id: semesterId },
  });

  // Fetch all enrolled students for this section with their grades
  const enrollments = await prisma.enrollment.findMany({
    where: {
      sectionId,
      isActive: true,
    },
    include: {
      user: true,
    },
    orderBy: {
      user: {
        lastName: "asc",
      },
    },
  });

  const studentIds = enrollments.map((e) => e.user.id);

  // Fetch grade records for all students in this semester
  const gradeRecords = await prisma.gradeRecord.findMany({
    where: {
      studentId: { in: studentIds },
      semesterConfigId: semesterId,
    },
  });

  // Build students with their grades
  const studentsWithGrades: StudentWithGrades[] = enrollments.map((e) => ({
    id: e.user.id,
    firstName: e.user.firstName,
    lastName: e.user.lastName,
    email: e.user.email,
    gradeRecords: gradeRecords.filter((r) => r.studentId === e.user.id),
  }));

  // Fetch milestone tracker scores (ScoreSnapshots)
  const scoreSnapshots = await prisma.scoreSnapshot.findMany({
    where: {
      studentId: { in: studentIds },
    },
  });

  const gradeWeights = (semesterConfig?.gradeWeights as Record<string, number>) || {};

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Gradebook</h1>
        <p className="mt-1 text-sm text-gray-500">
          Spreadsheet-style view of all students and grade categories.
        </p>
      </div>

      {/* Semester Tabs */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-gray-700">Semester</h2>
        <div className="flex flex-wrap gap-2">
          {activeYear.semesters.map((sem) => {
            const isActive = sem.id === semesterId;
            return (
              <Link
                key={sem.id}
                href={`?semester=${sem.id}&section=${sectionId}`}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  isActive
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {sem.semester}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Section Tabs */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-gray-700">Period / Section</h2>
        <div className="flex flex-wrap gap-2">
          {activeYear.sections.map((sec) => {
            const isActive = sec.id === sectionId;
            return (
              <Link
                key={sec.id}
                href={`?semester=${semesterId}&section=${sec.id}`}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  isActive
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {sec.label || `Period ${sec.period}`}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Export Button */}
      <div className="flex justify-end">
        <Link
          href={`/api/gradebook/export?sectionId=${sectionId}&semesterId=${semesterId}`}
          className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition"
        >
          Export to CSV
        </Link>
      </div>

      {/* Gradebook Table */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-6 py-3 text-left font-semibold text-gray-900 sticky left-0 bg-gray-50 z-10">
                Student
              </th>
              {GRADE_CATEGORIES.map((cat) => (
                <th
                  key={cat}
                  className="px-4 py-3 text-center font-semibold text-gray-900 whitespace-nowrap"
                >
                  {getCategoryLabel(cat)}
                </th>
              ))}
              <th className="px-4 py-3 text-center font-semibold text-gray-900 whitespace-nowrap">
                Final Grade
              </th>
            </tr>
          </thead>
          <tbody>
            {studentsWithGrades.length === 0 ? (
              <tr>
                <td colSpan={GRADE_CATEGORIES.length + 2} className="px-6 py-4 text-center text-gray-500">
                  No enrolled students in this section.
                </td>
              </tr>
            ) : (
              studentsWithGrades.map((student) => {
                const { percentage, grade } = calculateWeightedGrade(
                  student.gradeRecords,
                  gradeWeights
                );
                return (
                  <tr key={student.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900 sticky left-0 bg-white z-10">
                      <div>
                        {student.firstName} {student.lastName}
                      </div>
                      <div className="text-xs text-gray-500">{student.email}</div>
                    </td>
                    {GRADE_CATEGORIES.map((category) => {
                      const recordsInCategory = student.gradeRecords.filter(
                        (r) => r.category === category
                      );

                      // For milestone tracker, use snapshot if available
                      if (
                        category === "MILESTONE_TRACKER" &&
                        recordsInCategory.length === 0
                      ) {
                        const snapshot = scoreSnapshots.find(
                          (s) => s.studentId === student.id
                        );
                        if (snapshot) {
                          const milestonePercentage = Math.round(snapshot.percentage);
                          return (
                            <td
                              key={`${student.id}-${category}`}
                              className="px-4 py-4 text-center"
                            >
                              <div className="inline-block px-3 py-1 rounded bg-gray-100 text-gray-700 text-sm font-medium">
                                {milestonePercentage}%
                              </div>
                            </td>
                          );
                        }
                      }

                      if (recordsInCategory.length === 0) {
                        return (
                          <td
                            key={`${student.id}-${category}`}
                            className="px-4 py-4 text-center text-gray-400"
                          >
                            -
                          </td>
                        );
                      }

                      const totalScore = recordsInCategory.reduce(
                        (sum, r) => sum + r.score,
                        0
                      );
                      const totalMax = recordsInCategory.reduce(
                        (sum, r) => sum + r.maxScore,
                        0
                      );
                      const categoryPercentage = Math.round(
                        (totalScore / totalMax) * 100
                      );

                      return (
                        <td
                          key={`${student.id}-${category}`}
                          className="px-4 py-4 text-center"
                        >
                          <GradeCell
                            studentId={student.id}
                            semesterConfigId={semesterId}
                            category={category}
                            records={recordsInCategory}
                            totalScore={totalScore}
                            totalMax={totalMax}
                          />
                        </td>
                      );
                    })}
                    <td className="px-4 py-4 text-center font-semibold">
                      <div
                        className={`inline-block px-3 py-1 rounded-lg ${getGradeColor(
                          percentage
                        )}`}
                      >
                        {grade} ({Math.round(percentage)}%)
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
