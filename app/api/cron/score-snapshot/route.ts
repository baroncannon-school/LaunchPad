import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateStudentScore } from "@/lib/scoring";

// GET /api/cron/score-snapshot
// Cron handler: Fetch all active students and calculate their current scores
// Upserts ScoreSnapshot records for performance history and analysis
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret header for security
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch all active students with their team memberships and ventures
    const activeStudents = await prisma.user.findMany({
      where: {
        role: "STUDENT",
        isActive: true,
      },
      include: {
        teamMemberships: {
          where: { isActive: true },
          include: {
            venture: true,
          },
        },
      },
    });

    // Fetch all milestones and scoring rules upfront (for efficiency)
    const [allMilestones, scoringRules] = await Promise.all([
      prisma.milestoneDefinition.findMany({ orderBy: { sequenceOrder: "asc" } }),
      prisma.scoringRule.findMany({ where: { isActive: true } }),
    ]);

    let snapshotsCreated = 0;

    // Process each student
    for (const student of activeStudents) {
      for (const membership of student.teamMemberships) {
        const { venture } = membership;

        try {
          // Fetch this student's milestone progress for this venture
          const progressRecords = await prisma.milestoneProgress.findMany({
            where: {
              studentId: student.id,
              ventureId: venture.id,
            },
          });

          // Calculate score
          const result = calculateStudentScore(
            allMilestones,
            progressRecords,
            {
              ownershipType: venture.ownershipType,
              offeringType: venture.offeringType,
            },
            membership.teamRole,
            scoringRules
          );

          // Upsert the score snapshot
          await prisma.scoreSnapshot.upsert({
            where: {
              // Since ScoreSnapshot doesn't have a unique constraint, we create a new record each time
              // to maintain history. If you want single current snapshot, modify schema
              id: `${student.id}-${venture.id}-${new Date().toISOString().split('T')[0]}`,
            },
            create: {
              studentId: student.id,
              ventureId: venture.id,
              calculatedScore: result.totalScore,
              maxPossible: result.maxPossibleScore,
              percentage: result.percentage,
              completedCount: result.completedCount,
              applicableCount: result.applicableCount,
              breakdown: result.breakdown as any,
              calculatedAt: new Date(),
            },
            update: {
              calculatedScore: result.totalScore,
              maxPossible: result.maxPossibleScore,
              percentage: result.percentage,
              completedCount: result.completedCount,
              applicableCount: result.applicableCount,
              breakdown: result.breakdown as any,
              calculatedAt: new Date(),
            },
          });

          snapshotsCreated++;
        } catch (error) {
          console.error(
            `Error calculating score for student ${student.id} in venture ${venture.id}:`,
            error
          );
          // Continue processing other students
        }
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: `Score snapshots calculated for ${snapshotsCreated} student-venture pairs`,
        snapshotsCreated,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in score-snapshot cron:", error);
    return NextResponse.json(
      { error: "Failed to calculate score snapshots" },
      { status: 500 }
    );
  }
}
