import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MaterialType } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

/**
 * PATCH /api/materials/[materialId]
 * Update a material
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ materialId: string }> }
) {
  try {
    await requireRole("INSTRUCTOR");

    const { materialId } = await params;
    const body = await request.json();
    const { title, description, type, url, isPublished } = body;

    // Validate material type if provided
    if (type) {
      const validTypes = Object.values(MaterialType);
      if (!validTypes.includes(type)) {
        return NextResponse.json(
          { error: `Invalid material type. Must be one of: ${validTypes.join(", ")}` },
          { status: 400 }
        );
      }
    }

    const material = await prisma.material.update({
      where: { id: materialId },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(type && { type }),
        ...(url !== undefined && { url }),
        ...(isPublished !== undefined && { isPublished }),
      },
    });

    return NextResponse.json(material);
  } catch (error) {
    console.error("Error updating material:", error);
    return NextResponse.json(
      { error: "Failed to update material" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/materials/[materialId]
 * Delete a material
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ materialId: string }> }
) {
  try {
    await requireRole("INSTRUCTOR");

    const { materialId } = await params;

    await prisma.material.delete({
      where: { id: materialId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting material:", error);
    return NextResponse.json(
      { error: "Failed to delete material" },
      { status: 500 }
    );
  }
}
