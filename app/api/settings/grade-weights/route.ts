import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== "INSTRUCTOR") {
      return NextResponse.json(
        { message: "Unauthorized. Instructor access required." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { semesterConfigId, weights } = body;

    if (!semesterConfigId || typeof weights !== "object") {
      return NextResponse.json(
        { message: "Invalid request body. Expected 'semesterConfigId' and 'weights'." },
        { status: 400 }
      );
    }

    // Validate that weights sum to 100
    const total = Object.values(weights).reduce(
      (sum, val) => sum + (typeof val === "number" ? val : 0),
      0
    );

    if (Math.abs(total - 100) > 0.01) {
      return NextResponse.json(
        {
          message: `Weights must sum to 100%. Currently ${total.toFixed(1)}%.`,
        },
        { status: 400 }
      );
    }

    // Update the semester config with new weights
    await prisma.semesterConfig.update({
      where: { id: semesterConfigId },
      data: { gradeWeights: weights },
    });

    return NextResponse.json(
      { message: "Grade weights updated successfully." },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating grade weights:", error);
    return NextResponse.json(
      { message: "An error occurred while updating grade weights." },
      { status: 500 }
    );
  }
}
