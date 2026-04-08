import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { CheckInForm } from "@/components/check-ins/check-in-form";

export default async function ConductCheckInPage({
  params,
}: {
  params: Promise<{ ventureId: string }>;
}) {
  const user = await requireRole("MENTOR");
  const { ventureId } = await params;

  // ============================================================================
  // Verify mentor is assigned to this venture
  // ============================================================================
  const mentorAssignment = await prisma.mentorAssignment.findFirst({
    where: {
      userId: user.id,
      ventureId,
      isActive: true,
    },
  });

  if (!mentorAssignment) {
    notFound();
  }

  // ============================================================================
  // Fetch venture and team members
  // ============================================================================
  const venture = await prisma.venture.findUnique({
    where: { id: ventureId },
    include: {
      teamMemberships: {
        where: { isActive: true },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
            },
          },
        },
      },
    },
  });

  if (!venture) notFound();

  // Filter to students only
  const teamMembers = venture.teamMemberships
    .filter((tm: any) => tm.user.role === "STUDENT")
    .map((tm: any) => ({
      id: tm.user.id,
      firstName: tm.user.firstName,
      lastName: tm.user.lastName,
      email: tm.user.email,
    }));

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/mentor/dashboard" className="hover:text-gray-700">
          Dashboard
        </Link>
        <span>/</span>
        <Link href="/mentor/ventures" className="hover:text-gray-700">
          My Teams
        </Link>
        <span>/</span>
        <Link
          href={`/mentor/ventures/${ventureId}`}
          className="hover:text-gray-700"
        >
          {venture.name}
        </Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">Conduct Check-in</span>
      </nav>

      {/* Page Header */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Conduct New Check-in
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          Document your check-in with {venture.name}, record attendance, and
          track action items.
        </p>
      </div>

      {/* Form */}
      <CheckInForm
        ventureId={ventureId}
        ventureName={venture.name}
        teamMembers={teamMembers}
        redirectUrl={`/mentor/ventures/${ventureId}`}
      />
    </div>
  );
}
