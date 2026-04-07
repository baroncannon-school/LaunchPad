import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateAndSnapshotScore } from "@/lib/scoring";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/scores/calculate
 * Calculate and snapshot the score for a single student + venture.
 *
 * Body: { studentId, ventureId }
 * Requires: INSTRUCTOR role OR the requesting user IS the student
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

    const body = await request.json();
    const { studentId, ventureId } = body;

    if (!studentId || !ventureId) {
      return NextResponse.json(
        { error: "Missing studentId or ventureId" },
        { status: 400 }
      );
    }

    // Authorization: INSTRUCTOR or the student themselves
    if (user.role !== "INSTRUCTOR" && user.id !== studentId) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    // Verify student exists
    const student = await prisma.user.findUnique({
      where: { id: studentId },
    });
    if (!student) {
      return NextResponse.json(
        { error: "Student not found" },
        { status: 404 }
      );
    }

    // Verify venture exists
    const venture = await prisma.venture.findUnique({
      where: { id: ventureId },
    });
    if (!venture) {
      return NextResponse.json(
        { error: "Venture not found" },
        { status: 404 }
      );
    }

    // Calculate and snapshot the score
    const result = await calculateAndSnapshotScore(prisma, studentId, ventureId);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error calculating score:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
