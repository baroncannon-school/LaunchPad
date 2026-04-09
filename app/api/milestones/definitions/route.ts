import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/milestones/definitions — fetch all milestone definitions
export async function GET() {
  try {
    await requireRole("INSTRUCTOR");

    const milestones = await prisma.milestoneDefinition.findMany({
      orderBy: { sequenceOrder: "asc" },
    });

    return NextResponse.json(milestones);
  } catch (error) {
    console.error("Error fetching milestone definitions:", error);
    return NextResponse.json(
      { error: "Failed to fetch milestone definitions" },
      { status: 500 }
    );
  }
}

// PATCH /api/milestones/definitions — update a single milestone definition
export async function PATCH(request: NextRequest) {
  try {
    await requireRole("INSTRUCTOR");
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing milestone id" }, { status: 400 });
    }

    // Validate enum values if provided
    const validPeriods = ["P1_NOV", "P2_DEC", "P3_JAN", "P4_FEB", "P5_MAR", "P6_APR", "P7_MAY", "P8_OTHER"];
    const validOwnership = ["SCHOOL", "SELF", "BOTH"];
    const validOffering = ["PRODUCT", "SERVICE", "BOTH"];
    const validRequirement = ["REQUIRED", "OPTIONAL"];
    const validEvidence = ["FILE", "LINK", "TEXT", "NONE"];

    if (updates.period && !validPeriods.includes(updates.period)) {
      return NextResponse.json({ error: "Invalid period value" }, { status: 400 });
    }
    if (updates.ownershipFilter && !validOwnership.includes(updates.ownershipFilter)) {
      return NextResponse.json({ error: "Invalid ownership filter" }, { status: 400 });
    }
    if (updates.offeringFilter && !validOffering.includes(updates.offeringFilter)) {
      return NextResponse.json({ error: "Invalid offering filter" }, { status: 400 });
    }
    if (updates.requirementLevel && !validRequirement.includes(updates.requirementLevel)) {
      return NextResponse.json({ error: "Invalid requirement level" }, { status: 400 });
    }
    if (updates.evidenceType && !validEvidence.includes(updates.evidenceType)) {
      return NextResponse.json({ error: "Invalid evidence type" }, { status: 400 });
    }

    const updated = await prisma.milestoneDefinition.update({
      where: { id },
      data: updates,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating milestone definition:", error);
    return NextResponse.json(
      { error: "Failed to update milestone definition" },
      { status: 500 }
    );
  }
}
