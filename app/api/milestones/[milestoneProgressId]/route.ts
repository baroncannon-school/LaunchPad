import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PATCH /api/milestones/[milestoneProgressId] — Update a single milestone status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ milestoneProgressId: string }> }
) {
  try {
    const user = await requireRole("INSTRUCTOR");
    const { milestoneProgressId } = await params;
    const body = await request.json();
    const { status, instructorNotes } = body;

    // Validate status
    const validStatuses = ["NOT_STARTED", "IN_PROGRESS", "SUBMITTED", "VERIFIED", "WAIVED"];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (status) {
      updateData.status = status;
      if (status === "VERIFIED") {
        updateData.verifiedAt = new Date();
        updateData.verifiedBy = user.id;
      }
    }
    if (instructorNotes !== undefined) {
      updateData.instructorNotes = instructorNotes;
    }

    const updated = await prisma.milestoneProgress.update({
      where: { id: milestoneProgressId },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating milestone:", error);
    return NextResponse.json(
      { error: "Failed to update milestone" },
      { status: 500 }
    );
  }
}
