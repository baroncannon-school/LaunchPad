import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/cron/overdue-check
// Cron handler: Find milestones that are past their expected completion period but NOT_STARTED
// Creates MILESTONE_OVERDUE notifications for affected students
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret header for security
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Helper to determine if a period is overdue based on current date
    // Period enum: P1_NOV, P2_DEC, P3_JAN, P4_FEB, P5_MAR, P6_APR, P7_MAY, P8_OTHER
    const isOverdue = (period: string, currentMonth: number): boolean => {
      const periodMap: { [key: string]: number } = {
        P1_NOV: 11,
        P2_DEC: 12,
        P3_JAN: 1,
        P4_FEB: 2,
        P5_MAR: 3,
        P6_APR: 4,
        P7_MAY: 5,
        P8_OTHER: -1, // Never overdue (always current or future)
      };

      const periodMonth = periodMap[period];
      if (periodMonth === -1) return false; // P8_OTHER is never overdue

      // If we've passed the period's month in the current academic year, it's overdue
      return currentMonth > periodMonth;
    };

    const now = new Date();
    const currentMonth = now.getMonth() + 1; // 1-12

    // Fetch all milestones that are overdue
    const allMilestones = await prisma.milestoneDefinition.findMany();
    const overdueMillestones = allMilestones.filter((m) =>
      isOverdue(m.period, currentMonth)
    );

    if (overdueMillestones.length === 0) {
      return NextResponse.json(
        { success: true, message: "No overdue milestones", notificationsCreated: 0 },
        { status: 200 }
      );
    }

    let notificationsCreated = 0;

    // For each overdue milestone, find students with NOT_STARTED progress
    for (const milestone of overdueMillestones) {
      const notStartedProgress = await prisma.milestoneProgress.findMany({
        where: {
          milestoneDefinitionId: milestone.id,
          status: "NOT_STARTED",
        },
        include: {
          student: true,
          venture: true,
        },
      });

      // Create a notification for each affected student
      for (const progress of notStartedProgress) {
        try {
          await prisma.notification.create({
            data: {
              userId: progress.student.id,
              type: "MILESTONE_OVERDUE",
              title: `Milestone Overdue: ${milestone.title}`,
              body: `The milestone "${milestone.title}" was due in ${milestone.period.replace("_", " ")} and has not yet been started. Please complete it as soon as possible.`,
              metadata: {
                milestoneId: milestone.id,
                ventureId: progress.venture.id,
                milestonePeriod: milestone.period,
              } as any,
            },
          });

          notificationsCreated++;
        } catch (error) {
          console.error(
            `Error creating notification for student ${progress.student.id} and milestone ${milestone.id}:`,
            error
          );
          // Continue processing other notifications
        }
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: `Created ${notificationsCreated} overdue milestone notifications`,
        notificationsCreated,
        overdueMillestones: overdueMillestones.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in overdue-check cron:", error);
    return NextResponse.json(
      { error: "Failed to check for overdue milestones" },
      { status: 500 }
    );
  }
}
