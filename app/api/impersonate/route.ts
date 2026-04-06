import { getCurrentUser, IMPERSONATE_COOKIE } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    const user = await getCurrentUser();
    if (!user || user.role !== "INSTRUCTOR") {
          return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

    const body = await request.json();
    const studentId = body.studentId as string;

    if (!studentId) {
          return NextResponse.json({ error: "studentId is required" }, { status: 400 });
        }

    const student = await prisma.user.findUnique({
          where: { id: studentId, role: "STUDENT" },
        });

    if (!student) {
          return NextResponse.json({ error: "Student not found" }, { status: 404 });
        }

    const cookieStore = await cookies();
    cookieStore.set(IMPERSONATE_COOKIE, studentId, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: 60 * 60, // 1 hour
        });

    return NextResponse.json({
          ok: true,
          student: { id: student.id, name: student.name },
        });
  }

export async function DELETE() {
    const user = await getCurrentUser();
    if (!user || user.role !== "INSTRUCTOR") {
          return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

    const cookieStore = await cookies();
    cookieStore.delete(IMPERSONATE_COOKIE);

    return NextResponse.json({ ok: true });
  }
