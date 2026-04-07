import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/units
 * Create a new unit for a semester
 */
export async function POST(request: NextRequest) {
  try {
    await requireRole("INSTRUCTOR");

    const body = await request.json();
    const { semesterConfigId, title, description, isPublished } = body;

    if (!semesterConfigId || !title) {
      return NextResponse.json(
        { error: "semesterConfigId and title are required" },
        { status: 400 }
      );
    }

    // Get the highest sequence order for this semester
    const lastUnit = await prisma.unit.findFirst({
      where: { semesterConfigId },
      orderBy: { sequenceOrder: "desc" },
    });

    const sequenceOrder = (lastUnit?.sequenceOrder ?? 0) + 1;

    const unit = await prisma.unit.create({
      data: {
        semesterConfigId,
        title,
        description: description || null,
        sequenceOrder,
        isPublished: isPublished ?? false,
      },
      include: {
        materials: true,
      },
    });

    return NextResponse.json(unit, { status: 201 });
  } catch (error) {
    console.error("Error creating unit:", error);
    return NextResponse.json(
      { error: "Failed to create unit" },
      { status: 500 }
    );
  }
}
