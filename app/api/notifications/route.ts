import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/notifications
 * List notifications for current user with pagination and filtering
 * Query params:
 * - unreadOnly: boolean (default: false) - filter to unread notifications only
 * - limit: number (default: 20) - number of notifications to return
 * - cursor: string (optional) - cursor for pagination (notification ID)
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

    const searchParams = request.nextUrl.searchParams;
    const unreadOnly = searchParams.get("unreadOnly") === "true";
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100); // Cap at 100
    const cursor = searchParams.get("cursor") || undefined;

    // Build where clause
    const where = {
      userId: user.id,
      ...(unreadOnly && { isRead: false }),
    };

    // Get notifications
    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit + 1, // Fetch one extra to determine if there's a next page
      ...(cursor && {
        skip: 1,
        cursor: { id: cursor },
      }),
    });

    // Determine if there's a next page
    const hasNextPage = notifications.length > limit;
    const items = notifications.slice(0, limit);
    const nextCursor = hasNextPage ? items[items.length - 1]?.id : null;

    return NextResponse.json({
      notifications: items,
      pagination: {
        nextCursor,
        hasNextPage,
      },
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}
