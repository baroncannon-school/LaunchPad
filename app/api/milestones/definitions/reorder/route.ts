import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/milestones/definitions/reorder — reorder milestones
export async function POST(request: NextRequest) {
  try {
    await requireRole("INSTRUCTOR");
    const body = await request.json();
    const { orderedIds } = body;

    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return NextResponse.json({ error: "Missing orderedIds array" }, { status: 400 });
    }

    // Update sequence_order for each milestone
    const updates = orderedIds.map((id: string, index: number) =>
      prisma.milestoneDefinition.update({
        where: { id },
        data: { sequenceOrder: index + 1 },
      })
    );

    await prisma.$transaction(updates);

    return NextResponse.json({ success: true, reordered: orderedIds.length });
  } catch (error) {
    console.error("Error reordering milestones:", error);
    return NextResponse.json(
      { error: "Failed to reorder milestones" },
      { status: 500 }
    );
  }
}
