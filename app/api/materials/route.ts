import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MaterialType } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/materials
 * Create a new material in a unit
 */
export async function POST(request: NextRequest) {
  try {
    await requireRole("INSTRUCTOR");

    const body = await request.json();
    const { unitId, title, description, type, url, isPublished } = body;

    if (!unitId || !title || !type) {
      return NextResponse.json(
        { error: "unitId, title, and type are required" },
        { status: 400 }
      );
    }

    // Validate material type
    const validTypes = Object.values(MaterialType);
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid material type. Must be one of: ${validTypes.join(", ")}` },
        { status: 400 }
      );
    }

    // Get the highest sequence order for this unit
    const lastMaterial = await prisma.material.findFirst({
      where: { unitId },
      orderBy: { sequenceOrder: "desc" },
    });

    const sequenceOrder = (lastMaterial?.sequenceOrder ?? 0) + 1;

    const material = await prisma.material.create({
      data: {
        unitId,
        title,
        description: description || null,
        type,
        url: url || null,
        sequenceOrder,
        isPublished: isPublished ?? false,
      },
    });

    return NextResponse.json(material, { status: 201 });
  } catch (error) {
    console.error("Error creating material:", error);
    return NextResponse.json(
      { error: "Failed to create material" },
      { status: 500 }
    );
  }
}
