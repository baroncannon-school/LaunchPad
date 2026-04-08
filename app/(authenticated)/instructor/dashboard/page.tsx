import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

export default async function InstructorDashboard() {
  const user = await requireRole("INSTRUCTOR");

  // Fetch summary stats
  const [ventureCount, studentCount, pendingSubmissions] = await Promise.all([
    prisma.venture.count({ where: { status: "ACTIVE" } }),
    prisma.user.count({ where: { role: "STUDENT", isActive: true } }),
    prisma.milestoneProgress.count({ where: { status: "SUBMITTED" } }),
  ]);

  // Fetch priority queue (pending milestone submissions)
  const pendingMilestones = await prisma.milestoneProgress.findMany({
    where: { status: "SUBMITTED" },
    orderBy: { updatedAt: "asc" },
    take: 10,
    include: {
      milestone: {
        select: { title: true },
      },
      student: {
        select: { firstName: true, lastName: true },
      },
      venture: {
        select: { id: true, name: true },
      },
    },
  });

  // Fetch active ventures with check-ins
  const activeVentures = await prisma.venture.findMany({
    where: { status: "ACTIVE" },
    include: {
      checkIns: {
        orderBy: { conductedDate: "desc" },
        take: 1,
      },
    },
  });

  // Filter stale check-ins (> 14 days or never)
  const now = new Date();
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const staleCheckIns = activeVentures
    .filter(
      (v) =>
        v.checkIns.length === 0 || v.checkIns[0].conductedDate < twoWeeksAgo
    )
    .slice(0, 8);

  // Fetch recent activity
  const recentActivity = await prisma.activityLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 15,
    include: {
      user: {
        select: { firstName: true, lastName: true },
      },
      venture: {
        select: { name: true },
      },
    },
  });

  const todayDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  return (
    <div>
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user.firstName}
        </h1>
        <p className="mt-1 text-sm text-gray-500">{todayDate}</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard label="Active Ventures" value={ventureCount} />
        <StatCard label="Active Students" value={studentCount} />
        <StatCard
          label="Pending Reviews"
          value={pendingSubmissions}
          highlight={pendingSubmissions > 0}
        />
      </div>

      {/* Priority Queue and Stale Check-ins */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Priority Queue */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Priority Queue
          </h2>
          {pendingMilestones.length === 0 ? (
            <p className="text-sm text-gray-500">No pending submissions</p>
          ) : (
            <div className="space-y-3">
              {pendingMilestones.map((mp) => (
                <Link
                  key={mp.id}
                  href={`/instructor/ventures/${mp.venture.id}`}
                  className="block p-3 rounded-lg hover:bg-gray-50 border border-gray-100 transition"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {mp.student.firstName} {mp.student.lastName}
                      </p>
                      <p className="text-xs text-gray-600">
                        {mp.milestone.title}
                      </p>
                      <p className="text-xs text-gray-500">{mp.venture.name}</p>
                    </div>
                    <p className="text-xs text-gray-400 whitespace-nowrap ml-2">
                      {timeAgo(mp.updatedAt)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Stale Check-ins */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Stale Check-ins
          </h2>
          {staleCheckIns.length === 0 ? (
            <p className="text-sm text-gray-500">All check-ins up to date</p>
          ) : (
            <div className="space-y-3">
              {staleCheckIns.map((v) => (
                <Link
                  key={v.id}
                  href={`/instructor/ventures/${v.id}/check-ins`}
                  className="block p-3 rounded-lg hover:bg-gray-50 border border-gray-100 transition"
                >
                  <div className="flex justify-between items-start">
                    <p className="text-sm font-medium text-gray-900">
                      {v.name}
                    </p>
                    <p className="text-xs text-gray-500 whitespace-nowrap ml-2">
                      {v.checkIns.length === 0
                        ? "Never"
                        : timeAgo(v.checkIns[0].conductedDate)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Recent Activity
        </h2>
        {recentActivity.length === 0 ? (
          <p className="text-sm text-gray-500">No recent activity</p>
        ) : (
          <div className="space-y-2">
            {recentActivity.map((log) => (
              <div key={log.id} className="flex justify-between text-sm">
                <p className="text-gray-700">
                  <span className="font-medium">
                    {log.user.firstName} {log.user.lastName}
                  </span>{" "}
                  {log.action} on{" "}
                  <span className="font-medium">{log.venture.name}</span>
                </p>
                <p className="text-gray-500">{timeAgo(log.createdAt)}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          href="/instructor/ventures"
          className="rounded-xl border border-gray-200 bg-white p-6 hover:border-blue-300 hover:bg-blue-50 transition text-center"
        >
          <p className="font-semibold text-gray-900">New Check-In</p>
          <p className="text-sm text-gray-500 mt-1">
            Conduct a check-in with a venture
          </p>
        </Link>
        <Link
          href="/instructor/gradebook"
          className="rounded-xl border border-gray-200 bg-white p-6 hover:border-blue-300 hover:bg-blue-50 transition text-center"
        >
          <p className="font-semibold text-gray-900">Gradebook</p>
          <p className="text-sm text-gray-500 mt-1">Review grades and scores</p>
        </Link>
        <Link
          href="/instructor/materials"
          className="rounded-xl border border-gray-200 bg-white p-6 hover:border-blue-300 hover:bg-blue-50 transition text-center"
        >
          <p className="font-semibold text-gray-900">Materials</p>
          <p className="text-sm text-gray-500 mt-1">Manage course materials</p>
        </Link>
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
