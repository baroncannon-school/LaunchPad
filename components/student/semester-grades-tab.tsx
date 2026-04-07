"use client";

import { useState } from "react";

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

interface SemesterGradesTabProps {
  semesters: Array<{
    id: string;
    semester: "FALL" | "SPRING";
    startDate: Date;
    endDate: Date;
  }>;
  gradesMap: Record<string, GradeRecord[]>;
  gradeWeightsMap: Record<string, Record<GradeCategory, number>>;
  defaultSemesterId: string;
}

export function SemesterGradesTab({
  semesters,
  gradesMap,
  gradeWeightsMap,
  defaultSemesterId,
}: SemesterGradesTabProps) {
  const [selectedSemesterId, setSelectedSemesterId] = useState(defaultSemesterId);

  const selectedSemester = semesters.find((s) => s.id === selectedSemesterId);
  const selectedGrades = gradesMap[selectedSemesterId] || [];
  const selectedWeights = gradeWeightsMap[selectedSemesterId] || {};

  // Group grades by category
  const gradesByCategory: Record<GradeCategory, GradeRecord[]> = {
    EXAM: [],
    QUIZ: [],
    MILESTONE_TRACKER: [],
    AUTHENTIC_ASSESSMENT: [],
    FINAL_EXAM: [],
    DESIGN_SHOWCASE: [],
  };

  for (const grade of selectedGrades) {
    gradesByCategory[grade.category].push(grade);
  }

  // Calculate category averages and final weighted grade
  const categoryStats: Record<GradeCategory, { average: number; weight: number } | null> = {
    EXAM: null,
    QUIZ: null,
    MILESTONE_TRACKER: null,
    AUTHENTIC_ASSESSMENT: null,
    FINAL_EXAM: null,
    DESIGN_SHOWCASE: null,
  };

  for (const [category, grades] of Object.entries(gradesByCategory)) {
    if (grades.length > 0) {
      const categoryKey = category as GradeCategory;
      const average =
        grades.reduce((sum, g) => sum + (g.score / g.maxScore) * 100, 0) / grades.length;
      const weight = selectedWeights[categoryKey] || 0;
      categoryStats[categoryKey] = { average, weight };
    }
  }

  // Calculate weighted final grade
  let weightedFinalGrade = 0;
  let totalWeight = 0;
  for (const [category, stats] of Object.entries(categoryStats)) {
    if (stats) {
      const categoryKey = category as GradeCategory;
      const weight = selectedWeights[categoryKey] || 0;
      weightedFinalGrade += stats.average * weight;
      totalWeight += weight;
    }
  }
  if (totalWeight > 0) {
    weightedFinalGrade /= totalWeight;
  }

  const getCategoryLabel = (category: GradeCategory): string => {
    const labels: Record<GradeCategory, string> = {
      EXAM: "Exams",
      QUIZ: "Quizzes",
      MILESTONE_TRACKER: "Milestone Tracker",
      AUTHENTIC_ASSESSMENT: "Authentic Assessment",
      FINAL_EXAM: "Final Exam",
      DESIGN_SHOWCASE: "Design Showcase",
    };
    return labels[category];
  };

  const getGradeColor = (percentage: number): string => {
    if (percentage >= 90) return "text-green-700";
    if (percentage >= 80) return "text-green-600";
    if (percentage >= 70) return "text-yellow-600";
    if (percentage >= 60) return "text-orange-600";
    return "text-red-600";
  };

  const getGradeBgColor = (percentage: number): string => {
    if (percentage >= 90) return "bg-green-50";
    if (percentage >= 80) return "bg-green-50";
    if (percentage >= 70) return "bg-yellow-50";
    if (percentage >= 60) return "bg-orange-50";
    return "bg-red-50";
  };

  return (
    <div className="space-y-6">
      {/* Semester Toggle Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {semesters.map((sem) => (
          <button
            key={sem.id}
            onClick={() => setSelectedSemesterId(sem.id)}
            className={`px-4 py-2 font-medium transition-colors ${
              selectedSemesterId === sem.id
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {sem.semester === "FALL" ? "Fall" : "Spring"}
          </button>
        ))}
      </div>

      {selectedGrades.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-center">
          <p className="text-gray-600">
            No grades recorded yet for {selectedSemester?.semester === "FALL" ? "Fall" : "Spring"} semester.
          </p>
        </div>
      ) : (
        <>
          {/* Overall Grade Card */}
          <div className={`rounded-xl border border-gray-200 ${getGradeBgColor(weightedFinalGrade)} p-6`}>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Overall Grade</h2>
            <div className="flex items-baseline gap-3">
              <span className={`text-5xl font-bold ${getGradeColor(weightedFinalGrade)}`}>
                {weightedFinalGrade.toFixed(1)}%
              </span>
              <span className="text-lg text-gray-600">
                {weightedFinalGrade >= 90
                  ? "A"
                  : weightedFinalGrade >= 80
                  ? "B"
                  : weightedFinalGrade >= 70
                  ? "C"
                  : weightedFinalGrade >= 60
                  ? "D"
                  : "F"}
              </span>
            </div>
            <p className="text-sm text-gray-600 mt-3">Weighted by category</p>
          </div>

          {/* Grade Weights Reference */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {(Object.entries(categoryStats) as Array<[GradeCategory, (typeof categoryStats)[GradeCategory]]>)
              .filter(([, stats]) => stats !== null)
              .map(([category, stats]) => (
                <div key={category} className="rounded-lg border border-gray-200 bg-white p-3">
                  <p className="text-xs text-gray-600 uppercase tracking-wide">
                    {getCategoryLabel(category)}
                  </p>
                  <p className="text-lg font-semibold text-gray-900 mt-1">
                    {stats!.average.toFixed(1)}%
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    ({(stats!.weight * 100).toFixed(0)}% weight)
                  </p>
                </div>
              ))}
          </div>

          {/* Grade Categories with Details */}
          <div className="space-y-6">
            {(Object.entries(gradesByCategory) as Array<[GradeCategory, GradeRecord[]]>)
              .filter(([, grades]) => grades.length > 0)
              .map(([category, grades]) => {
                const average =
                  grades.reduce((sum, g) => sum + (g.score / g.maxScore) * 100, 0) /
                  grades.length;
                const weight = selectedWeights[category] || 0;

                return (
                  <div
                    key={category}
                    className="rounded-xl border border-gray-200 bg-white overflow-hidden"
                  >
                    {/* Category Header */}
                    <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                      <div className="flex justify-between items-baseline">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {getCategoryLabel(category)}
                        </h3>
                        <span className={`text-lg font-bold ${getGradeColor(average)}`}>
                          {average.toFixed(1)}%
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        Weight: {(weight * 100).toFixed(0)}%
                      </p>
                    </div>

                    {/* Grades Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-white border-b border-gray-200">
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wide">
                              Assignment
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wide">
                              Score
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wide">
                              Percentage
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {grades.map((grade) => {
                            const percentage = (grade.score / grade.maxScore) * 100;
                            return (
                              <tr
                                key={grade.id}
                                className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                              >
                                <td className="px-6 py-3 text-sm font-medium text-gray-900">
                                  {grade.label || "Assignment"}
                                </td>
                                <td className="px-6 py-3 text-sm text-right text-gray-600">
                                  {grade.score} / {grade.maxScore}
                                </td>
                                <td
                                  className={`px-6 py-3 text-sm text-right font-semibold ${getGradeColor(
                                    percentage
                                  )}`}
                                >
                                  {percentage.toFixed(1)}%
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
          </div>
        </>
      )}
    </div>
  );
}
