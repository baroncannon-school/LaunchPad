import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

const GRADE_CATEGORIES = [
  "EXAM",
  "QUIZ",
  "MILESTONE_TRACKER",
  "AUTHENTIC_ASSESSMENT",
  "FINAL_EXAM",
  "DESIGN_SHOWCASE",
] as const;

/**
 * GET /api/gradebook/export
 * Generate CSV export for Schoology import
 * Query params: sectionId, semesterId
 * Requires: INSTRUCTOR role
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Only instructors can export grades
    if (user.role !== "INSTRUCTOR") {
      return NextResponse.json(
        { error: "Forbidden: only instructors can export grades" },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const sectionId = searchParams.get("sectionId");
    const semesterId = searchParams.get("semesterId");

    if (!sectionId || !semesterId) {
      return NextResponse.json(
        { error: "Missing required query params: sectionId, semesterId" },
        { status: 400 }
      );
    }

    // Verify section and semester exist
    const section = await prisma.section.findUnique({
      where: { id: sectionId },
    });
    if (!section) {
      return NextResponse.json(
        { error: "Section not found" },
        { status: 404 }
      );
    }

    const semesterConfig = await prisma.semesterConfig.findUnique({
      where: { id: semesterId },
    });
    if (!semesterConfig) {
      return NextResponse.json(
        { error: "Semester config not found" },
        { status: 404 }
      );
    }

    // Fetch all enrolled students for this section
    const enrollments = await prisma.enrollment.findMany({
      where: {
        sectionId,
        isActive: true,
      },
      include: {
        user: true,
      },
      orderBy: {
        user: {
          lastName: "asc",
        },
      },
    });

    const studentIds = enrollments.map((e) => e.user.id);

    // Fetch grade records for all students in this semester
    const gradeRecords = await prisma.gradeRecord.findMany({
      where: {
        studentId: { in: studentIds },
        semesterConfigId: semesterId,
      },
    });

    // Fetch milestone tracker scores (ScoreSnapshots)
    const scoreSnapshots = await prisma.scoreSnapshot.findMany({
      where: {
        studentId: { in: studentIds },
      },
    });

    const gradeWeights = (semesterConfig.gradeWeights as Record<string, number>) || {};

    // Build CSV rows
    const csvLines: string[] = [];

    // Header row
    const headers = ["Student Name", "Student Email", ...GRADE_CATEGORIES.map(cat => {
      const labels: Record<string, string> = {
        EXAM: "EXAM",
        QUIZ: "QUIZ",
        MILESTONE_TRACKER: "MILESTONE_TRACKER",
        AUTHENTIC_ASSESSMENT: "AUTHENTIC_ASSESSMENT",
        FINAL_EXAM: "FINAL_EXAM",
        DESIGN_SHOWCASE: "DESIGN_SHOWCASE",
      };
      return labels[cat] || cat;
    }), "Weighted Final"];
    csvLines.push(headers.map(h => `"${h}"`).join(","));

    // Data rows
    for (const enrollment of enrollments) {
      const studentId = enrollment.user.id;
      const studentRecords = gradeRecords.filter((r) => r.studentId === studentId);

      // Calculate category averages
      const categoryPercentages: Record<string, number> = {};
      for (const category of GRADE_CATEGORIES) {
        let percentage = 0;

        if (category === "MILESTONE_TRACKER") {
          // Use latest ScoreSnapshot for milestone tracker
          const snapshot = scoreSnapshots.find((s) => s.studentId === studentId);
          percentage = snapshot ? snapshot.percentage : 0;
        } else {
          const recordsInCategory = studentRecords.filter(
            (r) => r.category === category
          );
          if (recordsInCategory.length > 0) {
            const totalScore = recordsInCategory.reduce((sum, r) => sum + r.score, 0);
            const totalMax = recordsInCategory.reduce(
              (sum, r) => sum + r.maxScore,
              0
            );
            percentage = totalMax > 0 ? (totalScore / totalMax) * 100 : 0;
          }
        }

        categoryPercentages[category] = percentage;
      }

      // Calculate weighted final grade
      let weightedSum = 0;
      let totalWeight = 0;
      for (const category of GRADE_CATEGORIES) {
        const weight = gradeWeights[category] || 0;
        if (weight > 0) {
          weightedSum += categoryPercentages[category] * weight;
          totalWeight += weight;
        }
      }
      const weightedFinal = totalWeight > 0 ? weightedSum / totalWeight : 0;

      // Build row
      const row = [
        `"${enrollment.user.firstName} ${enrollment.user.lastName}"`,
        `"${enrollment.user.email}"`,
        ...GRADE_CATEGORIES.map(cat => {
          const percentage = categoryPercentages[cat];
          return percentage > 0 ? percentage.toFixed(2) : "";
        }),
        weightedFinal > 0 ? weightedFinal.toFixed(2) : "",
      ];

      csvLines.push(row.join(","));
    }

    const csv = csvLines.join("\n");

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="gradebook-${semesterConfig.semester}-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error("Error exporting grades:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
