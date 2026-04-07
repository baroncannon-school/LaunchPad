import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ViewAsStudentButton } from "@/components/view-as-student-button";

export default async function StudentsPage() {
  await requireRole("INSTRUCTOR");

  const students = await prisma.user.findMany({
    where: { role: "STUDENT", isActive: true },
    include: {
      teamMemberships: {
        where: { isActive: true },
        include: {
          venture: {
            select: { id: true, name: true, section: { select: { period: true } } },
          },
        },
      },
      milestoneProgress: {
        select: { status: true },
      },
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Students</h1>
        <p className="mt-1 text-sm text-gray-500">
          {students.length} active students across all periods.
        </p>
      </div>

      {students.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <p className="text-gray-500">No students enrolled yet.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Venture
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Period
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Progress
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  View
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {students.map((student) => {
                const membership = student.teamMemberships[0];
                const total = student.milestoneProgress.length;
                const completed = student.milestoneProgress.filter(
                  (p) => p.status === "VERIFIED" || p.status === "SUBMITTED"
                ).length;
                const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

                return (
                  <tr key={student.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/instructor/students/${student.id}`}
                        className="text-sm font-medium text-blue-600 hover:text-blue-800"
                      >
                        {student.lastName}, {student.firstName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {membership ? (
                        <Link
                          href={`/instructor/ventures/${membership.venture.id}`}
                          className="hover:text-blue-600"
                        >
                          {membership.venture.name}
                        </Link>
                      ) : (
                        <span className="text-gray-400">Unassigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {membership
                        ? `P${membership.venture.section.period}`
                        : "\u2014"}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {membership?.teamRole === "LEAD" ? (
                        <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                          Lead \u2605
                        </span>
                      ) : membership ? (
                        <span className="text-gray-500 text-xs">Member</span>
                      ) : (
                        "\u2014"
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-100 rounded-full h-1.5">
                          <div
                            className="bg-green-500 h-1.5 rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500">{pct}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <ViewAsStudentButton
                        studentId={student.id}
                        studentName={`${student.firstName} ${student.lastName}`}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
