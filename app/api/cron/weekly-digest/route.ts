import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/cron/weekly-digest
// Cron handler: For each active instructor, compile weekly digest statistics
// Creates a WEEKLY_DIGEST notification with:
// - Number of pending submissions (milestoneProgress.status = "SUBMITTED")
// - Number of ventures with no check-in in past 14 days
// - Number of students below 50% score
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret header for security
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch all active instructors
    const instructors = await prisma.user.findMany({
      where: {
        role: "INSTRUCTOR",
        isActive: true,
      },
    });

    const now = new Date();
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    let digests = 0;

    // Process each instructor
    for (const instructor of instructors) {
      try {
        // Find all sections taught by this instructor
        // Note: We need to infer this from academic year enrollments
        // For now, we'll count venture activities across the system this instructor oversees
        // Assuming instructor has oversight through their enrollments

        // Get sections where this instructor has active enrollments
        const sections = await prisma.section.findMany({
          include: {
            enrollments: {
              where: {
                user: { id: instructor.id },
                isActive: true,
              },
            },
          },
        });

        const sectionIds = sections
          .filter((s) => s.enrollments.length > 0)
          .map((s) => s.id);

        if (sectionIds.length === 0) {
          // Instructor has no active sections, skip
          continue;
        }

        // Get all ventures in these sections
        const ventures = await prisma.venture.findMany({
          where: {
            sectionId: { in: sectionIds },
          },
        });

        const ventureIds = ventures.map((v) => v.id);

        if (ventureIds.length === 0) {
          continue;
        }

        // Count pending submissions (SUBMITTED status, not yet VERIFIED)
        const pendingSubmissions = await prisma.milestoneProgress.count({
          where: {
            ventureId: { in: ventureIds },
            status: "SUBMITTED",
          },
        });

        // Count ventures with no check-in in past 14 days
        const venturesWithRecentCheckIns = await prisma.checkIn.groupBy({
          by: ["ventureId"],
          where: {
            ventureId: { in: ventureIds },
            conductedDate: {
              gte: twoWeeksAgo,
            },
          },
        });

        const recentVentureIds = new Set(
          venturesWithRecentCheckIns.map((c) => c.ventureId)
        );
        const venturesWithoutRecentCheckIn = ventureIds.filter(
          (id) => !recentVentureIds.has(id)
        );

        // Count students below 50% score from recent snapshots
        const lowScoringRecords = await prisma.scoreSnapshot.findMany({
          where: {
            ventureId: { in: ventureIds },
            percentage: { lt: 50 },
            calculatedAt: {
              gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), // Latest snapshots from past week
            },
          },
          distinct: ["studentId"],
        });

        const studentsBelowThreshold = new Set(
          lowScoringRecords.map((r) => r.studentId)
        ).size;

        // Create digest notification
        const digestTitle = `Weekly Digest - ${now.toLocaleDateString()}`;
        const digestBody = `
Your weekly entrepreneurship course digest:

📋 Pending Submissions: ${pendingSubmissions} milestone(s) awaiting verification
🚨 Low Engagement: ${venturesWithoutRecentCheckIn.length} venture(s) without recent check-ins (past 14 days)
⚠️ Below Threshold: ${studentsBelowThreshold} student(s) scoring below 50%

Review the dashboard for more details and take action on pending items.
        `.trim();

        await prisma.notification.create({
          data: {
            userId: instructor.id,
            type: "WEEKLY_DIGEST",
            title: digestTitle,
            body: digestBody,
            metadata: {
              pendingSubmissions,
              venturesWithoutCheckIn: venturesWithoutRecentCheckIn.length,
              studentsBelowThreshold,
              digestDate: now.toISOString(),
            } as any,
          },
        });

        digests++;
      } catch (error) {
        console.error(`Error creating weekly digest for instructor ${instructor.id}:`, error);
        // Continue processing other instructors
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: `Created ${digests} weekly digest notification(s)`,
        digests,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in weekly-digest cron:", error);
    return NextResponse.json(
      { error: "Failed to generate weekly digests" },
      { status: 500 }
    );
  }
}
