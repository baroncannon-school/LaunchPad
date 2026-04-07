import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/financials/upload — Submit or update a financial statement
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Allow STUDENT or INSTRUCTOR (for testing/impersonation scenarios)
    if (user.role !== "STUDENT" && user.role !== "INSTRUCTOR") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { ventureId, month, fileUrl, notes } = body;

    // Validate required fields
    if (!ventureId || !month) {
      return NextResponse.json(
        { error: "ventureId and month are required" },
        { status: 400 }
      );
    }

    // Validate month format (e.g., "2026-02")
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json(
        { error: "Invalid month format (expected YYYY-MM)" },
        { status: 400 }
      );
    }

    // Verify venture exists
    const venture = await prisma.venture.findUnique({
      where: { id: ventureId },
    });
    if (!venture) {
      return NextResponse.json({ error: "Venture not found" }, { status: 404 });
    }

    // Verify user is part of the venture team (if STUDENT)
    if (user.role === "STUDENT") {
      const membership = await prisma.teamMembership.findFirst({
        where: {
          userId: user.id,
          ventureId: ventureId,
          isActive: true,
        },
      });
      if (!membership) {
        return NextResponse.json(
          { error: "You are not part of this venture" },
          { status: 403 }
        );
      }
    }

    // Upsert financial statement
    const statement = await prisma.financialStatement.upsert({
      where: {
        ventureId_month: {
          ventureId: ventureId,
          month: month,
        },
      },
      create: {
        ventureId: ventureId,
        submittedById: user.id,
        month: month,
        fileUrl: fileUrl || null,
        filePaths: [],
        status: "PENDING_REVIEW",
        feedback: notes || null,
        submittedAt: new Date(),
      },
      update: {
        submittedById: user.id,
        fileUrl: fileUrl || null,
        status: "PENDING_REVIEW",
        feedback: notes || null,
        submittedAt: new Date(),
        updatedAt: new Date(),
      },
      include: {
        submittedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        venture: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(statement, { status: 201 });
  } catch (error) {
    console.error("Error uploading financial statement:", error);
    return NextResponse.json(
      { error: "Failed to upload financial statement" },
      { status: 500 }
    );
  }
}
