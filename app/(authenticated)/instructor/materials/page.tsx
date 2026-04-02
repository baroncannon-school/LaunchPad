import { requireRole } from "@/lib/auth";

export default async function MaterialsPage() {
  await requireRole("INSTRUCTOR");

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Materials</h1>
        <p className="mt-1 text-sm text-gray-500">
          Course materials organized by semester and unit.
        </p>
      </div>
      <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
        <p className="text-gray-500">
          Materials library coming soon. Upload, reorder, and publish course
          materials for your students.
        </p>
      </div>
    </div>
  );
}
