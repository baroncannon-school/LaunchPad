import { requireRole } from "@/lib/auth";

export default async function SettingsPage() {
  await requireRole("INSTRUCTOR");

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Configure scoring rules, semester dates, and grade weights.
        </p>
      </div>
      <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
        <p className="text-gray-500">
          Settings panel coming soon. Manage scoring multipliers, semester dates,
          grade weight configuration, and Schoology integration.
        </p>
      </div>
    </div>
  );
}
