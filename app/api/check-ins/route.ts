import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/check-ins — List check-ins for a venture
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check that user is INSTRUCTOR or MENTOR
    if (user.role !== "INSTRUCTOR" && user.role !== "MENTOR") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get ventureId from query params
    const searchParams = request.nextUrl.searchParams;
    const ventureId = searchParams.get("ventureId");
    if (!ventureId) {
      return NextResponse.json(
        { error: "ventureId query parameter required" },
        { status: 400 }
      );
    }

    // If user is MENTOR, verify they're assigned to this venture
    if (user.role === "MENTOR") {
      const mentorAssignment = await prisma.mentorAssignment.findFirst({
        where: {
          userId: user.id,
          ventureId: ventureId,
          isActive: true,
        },
      });
      if (!mentorAssignment) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // Fetch check-ins with related data
    const checkIns = await prisma.checkIn.findMany({
      where: { ventureId },
      include: {
        conductedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        attendees: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: { conductedDate: "desc" },
    });

    return NextResponse.json(checkIns);
  } catch (error) {
    console.error("Error fetching check-ins:", error);
    return NextResponse.json(
      { error: "Failed to fetch check-ins" },
      { status: 500 }
    );
  }
}

// POST /api/check-ins — Create a new check-in
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check that user is INSTRUCTOR or MENTOR
    if (user.role !== "INSTRUCTOR" && user.role !== "MENTOR") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const {
      ventureId,
      notes,
      actionItems,
      nextCheckInDate,
      attendees,
    } = body;

    if (!ventureId) {
      return NextResponse.json(
        { error: "ventureId is required" },
        { status: 400 }
      );
    }

    // If user is MENTOR, verify they're assigned to this venture
    if (user.role === "MENTOR") {
      const mentorAssignment = await prisma.mentorAssignment.findFirst({
        where: {
          userId: user.id,
          ventureId: ventureId,
          isActive: true,
        },
      });
      if (!mentorAssignment) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // Verify venture exists
    const venture = await prisma.venture.findUnique({
      where: { id: ventureId },
    });
    if (!venture) {
      return NextResponse.json({ error: "Venture not found" }, { status: 404 });
    }

    // Create check-in
    const checkIn = await prisma.checkIn.create({
      data: {
        ventureId,
        conductedById: user.id,
        conductedDate: new Date(),
        notes: notes || null,
        actionItems: actionItems || null,
        nextCheckInDate: nextCheckInDate ? new Date(nextCheckInDate) : null,
      },
    });

    // Create attendee records
    if (attendees && Array.isArray(attendees)) {
      await prisma.checkInAttendee.createMany({
        data: attendees.map((a: { userId: string; wasPresent: boolean }) => ({
          checkInId: checkIn.id,
          userId: a.userId,
          wasPresent: a.wasPresent,
        })),
      });
    }

    // Fetch complete check-in with relations
    const completeCheckIn = await prisma.checkIn.findUnique({
      where: { id: checkIn.id },
      include: {
        conductedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        attendees: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(completeCheckIn, { status: 201 });
  } catch (error) {
    console.error("Error creating check-in:", error);
    return NextResponse.json(
      { error: "Failed to create check-in" },
      { status: 500 }
    );
  }
}
