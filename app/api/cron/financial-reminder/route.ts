import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/cron/financial-reminder
// Cron handler: Check what month we're in and find ventures that haven't submitted
// a FinancialStatement for the current month
// Creates FINANCIAL_STATEMENT_DUE notifications for team leads
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret header for security
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Determine current academic month
    // Mapping: Nov=Q2, Dec=Q2, Jan=Q3, Feb=Q3, Mar=Q3, Apr=Q4, May=Q4, Jun/Jul/Aug/Sep/Oct=off-season
    const now = new Date();
    const currentMonth = now.getMonth() + 1; // 1-12
    const currentYear = now.getFullYear();

    // Determine if we're in an active financial reporting period
    const isActiveFinancialMonth = currentMonth >= 11 || (currentMonth >= 1 && currentMonth <= 5);

    if (!isActiveFinancialMonth) {
      return NextResponse.json(
        { success: true, message: "Not in active financial reporting period", notificationsCreated: 0 },
        { status: 200 }
      );
    }

    // Format current month for FinancialStatement lookup (e.g., "2026-04")
    const currentMonthStr = `${currentYear}-${String(currentMonth).padStart(2, "0")}`;

    // Fetch all active ventures
    const ventures = await prisma.venture.findMany({
      where: {
        status: "ACTIVE",
      },
      include: {
        teamMemberships: {
          where: {
            teamRole: "LEAD",
            isActive: true,
          },
          include: {
            user: true,
          },
        },
      },
    });

    let remindersCreated = 0;

    // For each venture, check if financial statement exists for current month
    for (const venture of ventures) {
      try {
        // Check if a financial statement exists for this month
        const existingStatement = await prisma.financialStatement.findUnique({
          where: {
            ventureId_month: {
              ventureId: venture.id,
              month: currentMonthStr,
            },
          },
        });

        // If no statement exists or it's still NOT_SUBMITTED, notify team leads
        const needsReminder =
          !existingStatement ||
          existingStatement.status === "NOT_SUBMITTED";

        if (needsReminder) {
          // Create notification for each team lead
          for (const membership of venture.teamMemberships) {
            try {
              const monthName = new Date(currentYear, currentMonth - 1).toLocaleDateString(
                "en-US",
                { month: "long", year: "numeric" }
              );

              await prisma.notification.create({
                data: {
                  userId: membership.user.id,
                  type: "FINANCIAL_STATEMENT_DUE",
                  title: `Financial Statement Due: ${venture.name}`,
                  body: `Please submit the financial statement for "${venture.name}" for ${monthName}. This helps track your venture's financial health and is required for course evaluation.`,
                  metadata: {
                    ventureId: venture.id,
                    month: currentMonthStr,
                    monthName,
                  } as any,
                },
              });

              remindersCreated++;
            } catch (error) {
              console.error(
                `Error creating financial reminder for lead ${membership.user.id} in venture ${venture.id}:`,
                error
              );
              // Continue processing other leads
            }
          }
        }
      } catch (error) {
        console.error(`Error processing venture ${venture.id} for financial reminders:`, error);
        // Continue processing other ventures
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: `Created ${remindersCreated} financial statement reminder notification(s)`,
        remindersCreated,
        currentMonth: currentMonthStr,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in financial-reminder cron:", error);
    return NextResponse.json(
      { error: "Failed to send financial reminders" },
      { status: 500 }
    );
  }
}
