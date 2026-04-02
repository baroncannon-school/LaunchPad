import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/milestones/bulk-update — Instructor creates or updates milestone progress records
export async function POST(request: NextRequest) {
  try {
    const user = await requireRole("INSTRUCTOR");
    const body = await request.json();
    const { updates } = body;
    // updates: Array<{ studentId, ventureId, milestoneDefinitionId, status }>

    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json({ error: "No updates provided" }, { status: 400 });
    }

    const validStatuses = ["NOT_STARTED", "IN_PROGRESS", "SUBMITTED", "VERIFIED", "WAIVED"];
    const results = [];

    for (const update of updates) {
      const { studentId, ventureId, milestoneDefinitionId, status } = update;

      if (!validStatuses.includes(status)) continue;

      // Upsert: create the progress record if it doesn't exist, or update status
      const result = await prisma.milestoneProgress.upsert({
        where: {
          studentId_milestoneDefinitionId: {
            studentId,
            milestoneDefinitionId,
          },
        },
        create: {
          studentId,
          ventureId,
          milestoneDefinitionId,
          status,
          ...(status === "VERIFIED"
            ? { verifiedAt: new Date(), verifiedBy: user.id }
            : {}),
        },
        update: {
          status,
          ...(status === "VERIFIED"
            ? { verifiedAt: new Date(), verifiedBy: user.id }
            : {}),
        },
      });

      results.push(result);
    }

    return NextResponse.json({ updated: results.length, results });
  } catch (error) {
    console.error("Error in bulk update:", error);
    return NextResponse.json(
      { error: "Failed to update milestones" },
      { status: 500 }
    );
  }
}
