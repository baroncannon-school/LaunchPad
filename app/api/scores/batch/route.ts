import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateSectionScores } from "@/lib/scoring";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/scores/batch
 * Recalculate scores for all students in a section.
 *
 * Body: { sectionId }
 * Requires: INSTRUCTOR role
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Only instructors can batch recalculate
    if (user.role !== "INSTRUCTOR") {
      return NextResponse.json(
        { error: "Forbidden: only instructors can batch recalculate" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { sectionId } = body;

    if (!sectionId) {
      return NextResponse.json(
        { error: "Missing sectionId" },
        { status: 400 }
      );
    }

    // Verify section exists
    const section = await prisma.section.findUnique({
      where: { id: sectionId },
    });
    if (!section) {
      return NextResponse.json(
        { error: "Section not found" },
        { status: 404 }
      );
    }

    // Calculate scores for all students in this section
    const results = await calculateSectionScores(prisma, sectionId);

    // Convert Map to array for JSON serialization
    const resultsArray = Array.from(results.entries()).map(([studentId, scoreResult]) => ({
      studentId,
      ...scoreResult,
    }));

    return NextResponse.json({
      studentsProcessed: results.size,
      results: resultsArray,
    });
  } catch (error) {
    console.error("Error batch calculating scores:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
