import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ScoringRulesEditor from "@/components/settings/scoring-rules-editor";
import GradeWeightsEditor from "@/components/settings/grade-weights-editor";

export default async function SettingsPage() {
  const user = await requireRole("INSTRUCTOR");

  // Fetch scoring rules
  const scoringRules = await prisma.scoringRule.findMany({
    where: { isActive: true },
    orderBy: { teamRole: "asc" },
  });

  // Fetch active academic year and semester configs
  const activeYear = await prisma.academicYear.findFirst({
    where: { isActive: true },
    include: {
      semesterConfigs: {
        orderBy: { semester: "asc" },
      },
    },
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Configure scoring rules, semester dates, and grade weights.
        </p>
      </div>

      <div className="space-y-6">
        {/* Section 1: Scoring Rules */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Scoring Rules</h2>
            <p className="mt-1 text-sm text-gray-600">
              Adjust multipliers for different team roles and requirements.
            </p>
          </div>
          <ScoringRulesEditor rules={scoringRules} />
        </div>

        {/* Section 2: Grade Weights */}
        {activeYear && (
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Grade Weights</h2>
              <p className="mt-1 text-sm text-gray-600">
                Configure the percentage weight for each grade category in your course.
              </p>
            </div>
            <GradeWeightsEditor semesterConfigs={activeYear.semesterConfigs} />
          </div>
        )}

        {/* Section 3: Semester Dates */}
        {activeYear && (
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Semester Dates</h2>
              <p className="mt-1 text-sm text-gray-600">
                View the current academic year and semester date ranges.
              </p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Academic Year
                </label>
                <p className="mt-1 text-sm text-gray-900">
                  {activeYear.startDate.getFullYear()} -{" "}
                  {activeYear.endDate.getFullYear()}
                </p>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {activeYear.semesterConfigs.map((config) => (
                  <div key={config.id}>
                    <label className="block text-sm font-medium text-gray-700">
                      {config.semester} Semester
                    </label>
                    <p className="mt-1 text-sm text-gray-900">
                      {config.startDate.toLocaleDateString()} -{" "}
                      {config.endDate.toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
