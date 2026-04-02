import { requireRole } from "@/lib/auth";

export default async function GradebookPage() {
  await requireRole("INSTRUCTOR");

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Gradebook</h1>
        <p className="mt-1 text-sm text-gray-500">
          Spreadsheet-style view of all students and grade categories.
        </p>
      </div>
      <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
        <p className="text-gray-500">
          Gradebook coming soon. This will include a spreadsheet-style view with
          auto-populated milestone tracker scores, manual entry for exams and
          quizzes, and weighted final grade calculation.
        </p>
      </div>
    </div>
  );
}
