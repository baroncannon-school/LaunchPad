import { prisma } from "@/lib/prisma";

/**
 * Activity logging utility for LaunchPad
 * Logs user actions to the ActivityLog table
 */

export const ACTIONS = {
  MILESTONE_COMPLETED: "milestone.completed",
  MILESTONE_SUBMITTED: "milestone.submitted",
  MILESTONE_APPROVED: "milestone.approved",
  MILESTONE_REVISION: "milestone.revision_requested",
  CHECKIN_CONDUCTED: "checkin.conducted",
  FINANCIAL_SUBMITTED: "financial.submitted",
  FINANCIAL_ACCEPTED: "financial.accepted",
  FINANCIAL_REVISION: "financial.revision_requested",
  GRADE_UPDATED: "grade.updated",
  MATERIAL_CREATED: "material.created",
  MATERIAL_UPDATED: "material.updated",
  SCORE_CALCULATED: "score.calculated",
  IMPERSONATION_STARTED: "impersonation.started",
  IMPERSONATION_ENDED: "impersonation.ended",
} as const;

export interface LogActivityParams {
  userId?: string;
  ventureId?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, any>;
}

/**
 * Log an activity to the ActivityLog table
 * Fire-and-forget operation that won't break main flow if it fails
 */
export function logActivity(params: LogActivityParams): void {
  // Fire-and-forget - don't await and catch errors silently
  prisma.activityLog
    .create({
      data: {
        userId: params.userId,
        ventureId: params.ventureId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        metadata: params.metadata,
      },
    })
    .catch(() => {
      // Silently catch errors to prevent breaking main flow
      // Could optionally log to console in development
      if (process.env.NODE_ENV === "development") {
        console.error("[ActivityLog] Failed to log activity:", params.action);
      }
    });
}
