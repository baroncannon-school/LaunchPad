import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== "INSTRUCTOR") {
      return NextResponse.json(
        { message: "Unauthorized. Instructor access required." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { rules } = body;

    if (!Array.isArray(rules)) {
      return NextResponse.json(
        { message: "Invalid request body. Expected 'rules' array." },
        { status: 400 }
      );
    }

    // Validate and update each scoring rule
    for (const rule of rules) {
      if (!rule.id || typeof rule.multiplier !== "number") {
        return NextResponse.json(
          { message: "Each rule must have 'id' and 'multiplier'." },
          { status: 400 }
        );
      }

      await prisma.scoringRule.update({
        where: { id: rule.id },
        data: { multiplier: rule.multiplier },
      });
    }

    return NextResponse.json(
      { message: "Scoring rules updated successfully." },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating scoring rules:", error);
    return NextResponse.json(
      { message: "An error occurred while updating scoring rules." },
      { status: 500 }
    );
  }
}
