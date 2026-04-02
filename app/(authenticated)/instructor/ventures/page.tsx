import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function VenturesPage() {
  const user = await requireRole("INSTRUCTOR");

  const ventures = await prisma.venture.findMany({
    where: { status: "ACTIVE" },
    include: {
      section: true,
      teamMemberships: {
        where: { isActive: true },
        include: { user: { select: { id: true, firstName: true, lastName: true, role: true } } },
      },
      milestoneProgress: {
        select: { status: true },
      },
    },
    orderBy: [{ section: { period: "asc" } }, { name: "asc" }],
  });

  // Group ventures by period
  const grouped = new Map<number, typeof ventures>();
  for (const v of ventures) {
    const period = v.section.period;
    if (!grouped.has(period)) grouped.set(period, []);
    grouped.get(period)!.push(v);
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Ventures</h1>
        <p className="mt-1 text-sm text-gray-500">
          All active ventures across your class periods.
        </p>
      </div>

      {ventures.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <p className="text-gray-500">No active ventures yet.</p>
          <p className="text-sm text-gray-400 mt-1">
            Ventures will appear here once students create them.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {Array.from(grouped.entries())
            .sort(([a], [b]) => a - b)
            .map(([period, periodVentures]) => (
              <div key={period}>
                <h2 className="text-lg font-semibold text-gray-700 mb-3">
                  Period {period}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {periodVentures.map((venture) => {
                    const members = venture.teamMemberships.filter(
                      (tm) => tm.user.role === "STUDENT"
                    );
                    const totalProgress = venture.milestoneProgress.length;
                    const completedProgress = venture.milestoneProgress.filter(
                      (p) => p.status === "VERIFIED" || p.status === "SUBMITTED"
                    ).length;
                    const pct =
                      totalProgress > 0
                        ? Math.round((completedProgress / totalProgress) * 100)
                        : 0;

                    return (
                      <Link
                        key={venture.id}
                        href={`/instructor/ventures/${venture.id}`}
                        className="block rounded-xl border border-gray-200 bg-white p-5 hover:border-gray-300 hover:shadow-sm transition-all"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-semibold text-gray-900">
                              {venture.name}
                            </h3>
                            <div className="flex gap-2 mt-1">
                              <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                                {venture.ownershipType}
                              </span>
                              <span className="inline-flex items-center rounded-full bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700">
                                {venture.offeringType}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Members */}
                        <div className="mb-3">
                          <p className="text-xs font-medium text-gray-500 mb-1">
                            Team ({members.length})
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {members.map((m) => (
                              <span
                                key={m.user.id}
                                className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-700"
                              >
                                {m.user.firstName} {m.user.lastName.charAt(0)}.
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Progress bar */}
                        <div>
                          <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span>Progress</span>
                            <span>{pct}%</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-2">
                            <div
                              className="bg-green-500 h-2 rounded-full transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
