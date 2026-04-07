import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/units/[unitId]
 * Fetch a unit with its materials
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ unitId: string }> }
) {
  try {
    const { unitId } = await params;

    const unit = await prisma.unit.findUnique({
      where: { id: unitId },
      include: {
        materials: {
          orderBy: { sequenceOrder: "asc" },
        },
      },
    });

    if (!unit) {
      return NextResponse.json(
        { error: "Unit not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(unit);
  } catch (error) {
    console.error("Error fetching unit:", error);
    return NextResponse.json(
      { error: "Failed to fetch unit" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/units/[unitId]
 * Update a unit
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ unitId: string }> }
) {
  try {
    await requireRole("INSTRUCTOR");

    const { unitId } = await params;
    const body = await request.json();
    const { title, description, isPublished } = body;

    const unit = await prisma.unit.update({
      where: { id: unitId },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(isPublished !== undefined && { isPublished }),
      },
      include: {
        materials: true,
      },
    });

    return NextResponse.json(unit);
  } catch (error) {
    console.error("Error updating unit:", error);
    return NextResponse.json(
      { error: "Failed to update unit" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/units/[unitId]
 * Delete a unit (cascade deletes materials)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ unitId: string }> }
) {
  try {
    await requireRole("INSTRUCTOR");

    const { unitId } = await params;

    // Delete all materials in this unit first (or let cascade handle it)
    await prisma.unit.delete({
      where: { id: unitId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting unit:", error);
    return NextResponse.json(
      { error: "Failed to delete unit" },
      { status: 500 }
    );
  }
}
