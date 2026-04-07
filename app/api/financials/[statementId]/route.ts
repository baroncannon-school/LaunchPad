import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/financials/[statementId] — Fetch a specific financial statement
export async function GET(
  request: NextRequest,
  { params }: { params: { statementId: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { statementId } = params;

    // Fetch the statement with relations
    const statement = await prisma.financialStatement.findUnique({
      where: { id: statementId },
      include: {
        venture: {
          select: {
            id: true,
            name: true,
            section: {
              select: {
                id: true,
                period: true,
              },
            },
          },
        },
        submittedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!statement) {
      return NextResponse.json(
        { error: "Statement not found" },
        { status: 404 }
      );
    }

    // Verify user has access: either is INSTRUCTOR or part of the venture
    if (user.role === "STUDENT") {
      const membership = await prisma.teamMembership.findFirst({
        where: {
          userId: user.id,
          ventureId: statement.ventureId,
          isActive: true,
        },
      });
      if (!membership) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    return NextResponse.json(statement);
  } catch (error) {
    console.error("Error fetching financial statement:", error);
    return NextResponse.json(
      { error: "Failed to fetch statement" },
      { status: 500 }
    );
  }
}

// PATCH /api/financials/[statementId] — Review and update status
export async function PATCH(
  request: NextRequest,
  { params }: { params: { statementId: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Require INSTRUCTOR role
    if (user.role !== "INSTRUCTOR") {
      return NextResponse.json(
        { error: "Only instructors can review statements" },
        { status: 403 }
      );
    }

    const { statementId } = params;
    const body = await request.json();
    const { status, feedback } = body;

    // Validate status
    const validStatuses = ["ACCEPTED", "REVISION_REQUESTED"];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Status must be one of: ${validStatuses.join(", ")}` },
        { status: 400 }
      );
    }

    // Fetch the statement to verify it exists
    const statement = await prisma.financialStatement.findUnique({
      where: { id: statementId },
    });

    if (!statement) {
      return NextResponse.json(
        { error: "Statement not found" },
        { status: 404 }
      );
    }

    // Update the statement
    const updated = await prisma.financialStatement.update({
      where: { id: statementId },
      data: {
        status: status as any,
        feedback: feedback || null,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      },
      include: {
        venture: {
          select: {
            id: true,
            name: true,
          },
        },
        submittedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating financial statement:", error);
    return NextResponse.json(
      { error: "Failed to update statement" },
      { status: 500 }
    );
  }
}
