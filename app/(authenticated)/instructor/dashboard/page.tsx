import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function InstructorDashboard() {
  const user = await requireRole("INSTRUCTOR");

  // Fetch summary stats
  const [ventureCount, studentCount, pendingSubmissions] = await Promise.all([
    prisma.venture.count({ where: { status: "ACTIVE" } }),
    prisma.user.count({ where: { role: "STUDENT", isActive: true } }),
    prisma.milestoneProgress.count({ where: { status: "SUBMITTED" } }),
  ]);

  return (
    <div>
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user.firstName}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Here&apos;s what&apos;s happening across your classes today.
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard label="Active Ventures" value={ventureCount} />
        <StatCard label="Students" value={studentCount} />
        <StatCard
          label="Pending Reviews"
          value={pendingSubmissions}
          highlight={pendingSubmissions > 0}
        />
      </div>

      {/* Placeholder sections — to be built out */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Priority Queue
          </h2>
          <p className="text-sm text-gray-500">
            Overdue milestones, submissions needing review, and stale check-ins
            will appear here.
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Recent Activity
          </h2>
          <p className="text-sm text-gray-500">
            Student submissions, milestone completions, and system events will
            appear here.
          </p>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p
        className={`mt-1 text-3xl font-bold ${highlight ? "text-amber-600" : "text-gray-900"}`}
      >
        {value}
      </p>
    </div>
  );
}
