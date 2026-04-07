import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/gradebook
 * Create or update a grade record.
 * Body: { studentId, semesterConfigId, category, label?, score, maxScore }
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

    // Only instructors can manage grades
    if (user.role !== "INSTRUCTOR") {
      return NextResponse.json(
        { error: "Forbidden: only instructors can manage grades" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { studentId, semesterConfigId, category, label, score, maxScore } =
      body;

    // Validate required fields
    if (!studentId || !semesterConfigId || !category || score === undefined || !maxScore) {
      return NextResponse.json(
        { error: "Missing required fields: studentId, semesterConfigId, category, score, maxScore" },
        { status: 400 }
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

    // Verify semester config exists
    const semesterConfig = await prisma.semesterConfig.findUnique({
      where: { id: semesterConfigId },
    });
    if (!semesterConfig) {
      return NextResponse.json(
        { error: "Semester config not found" },
        { status: 404 }
      );
    }

    // Upsert: find existing record manually, then create or update
    const existing = await prisma.gradeRecord.findFirst({
      where: {
        studentId,
        semesterConfigId,
        category,
        label,
      },
    });

    let gradeRecord;
    if (existing) {
      gradeRecord = await prisma.gradeRecord.update({
        where: { id: existing.id },
        data: {
          score,
          maxScore,
          updatedAt: new Date(),
        },
      });
    } else {
      gradeRecord = await prisma.gradeRecord.create({
        data: {
          studentId,
          semesterConfigId,
          category,
          label,
          score,
          maxScore,
        },
      });
    }

    return NextResponse.json(gradeRecord);
  } catch (error) {
    console.error("Error saving grade:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
