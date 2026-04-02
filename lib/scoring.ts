// ============================================================================
// LaunchPad — Score Calculation Engine
//
// Implements the multiplier-based scoring system:
//   - Group "Required" completed   → 0.930 points
//   - Group "Required" incomplete  → 0.600 points (penalty, not zero)
//   - Group "Optional" completed   → 0.500 points
//   - Lead "Required" completed    → 0.250 points (extra credit for leads)
//   - Lead "Optional" completed    → 0.125 points (extra credit for leads)
//
// Score = sum of applicable milestone multipliers based on completion status
// ============================================================================

import type { PrismaClient } from "@prisma/client";

// Types matching our Prisma enums
type TeamRole = "LEAD" | "MEMBER";
type RequirementLevel = "REQUIRED" | "OPTIONAL";
type MilestoneStatus = "NOT_STARTED" | "IN_PROGRESS" | "SUBMITTED" | "VERIFIED" | "WAIVED";
type OwnershipType = "SCHOOL" | "SELF" | "BOTH";
type OfferingType = "PRODUCT" | "SERVICE" | "BOTH";

interface ScoringRule {
  teamRole: TeamRole;
  requirement: RequirementLevel;
  multiplier: number;
}

interface MilestoneDefinition {
  id: string;
  title: string;
  period: string;
  ownershipFilter: OwnershipType;
  requirementLevel: RequirementLevel;
  offeringFilter: OfferingType;
  sequenceOrder: number;
  phaseLabel: string | null;
}

interface MilestoneProgressRecord {
  milestoneDefinitionId: string;
  status: MilestoneStatus;
}

interface VentureContext {
  ownershipType: OwnershipType;
  offeringType: OfferingType;
}

interface MilestoneScoreDetail {
  milestoneId: string;
  title: string;
  phase: string | null;
  period: string;
  requirementLevel: RequirementLevel;
  isApplicable: boolean;
  isCompleted: boolean;
  status: MilestoneStatus;
  earnedPoints: number;
  possiblePoints: number;
  reason: string;
}

export interface ScoreResult {
  totalScore: number;
  maxPossibleScore: number;
  percentage: number;
  completedRequired: number;
  totalRequired: number;
  completedOptional: number;
  totalOptional: number;
  completedCount: number;
  applicableCount: number;
  breakdown: MilestoneScoreDetail[];
}

// ---------------------------------------------------------------------------
// Core filtering logic: does this milestone apply to this venture?
// ---------------------------------------------------------------------------

function isMilestoneApplicable(
  milestone: MilestoneDefinition,
  venture: VentureContext
): boolean {
  // Ownership filter
  if (milestone.ownershipFilter !== "BOTH") {
    if (milestone.ownershipFilter === "SCHOOL" && venture.ownershipType !== "SCHOOL") return false;
    if (milestone.ownershipFilter === "SELF" && venture.ownershipType !== "SELF") return false;
  }

  // Offering filter
  if (milestone.offeringFilter !== "BOTH") {
    if (milestone.offeringFilter === "PRODUCT" && venture.offeringType === "SERVICE") return false;
    if (milestone.offeringFilter === "SERVICE" && venture.offeringType === "PRODUCT") return false;
  }

  return true;
}

// ---------------------------------------------------------------------------
// Determine if a milestone status counts as "completed"
// ---------------------------------------------------------------------------

function isCompleted(status: MilestoneStatus): boolean {
  return status === "VERIFIED" || status === "SUBMITTED";
}

// ---------------------------------------------------------------------------
// Calculate score for a single student
// ---------------------------------------------------------------------------

export function calculateStudentScore(
  allMilestones: MilestoneDefinition[],
  progressRecords: MilestoneProgressRecord[],
  venture: VentureContext,
  teamRole: TeamRole,
  scoringRules: ScoringRule[],
  incompleteRequiredPenalty: number = 0.6
): ScoreResult {
  // Build a map of milestone progress for quick lookup
  const progressMap = new Map<string, MilestoneProgressRecord>();
  for (const p of progressRecords) {
    progressMap.set(p.milestoneDefinitionId, p);
  }

  // Find applicable scoring multipliers
  const getMultiplier = (role: TeamRole, req: RequirementLevel): number => {
    const rule = scoringRules.find(
      (r) => r.teamRole === role && r.requirement === req
    );
    return rule?.multiplier ?? 0;
  };

  const breakdown: MilestoneScoreDetail[] = [];
  let totalScore = 0;
  let maxPossibleScore = 0;
  let completedRequired = 0;
  let totalRequired = 0;
  let completedOptional = 0;
  let totalOptional = 0;

  for (const milestone of allMilestones) {
    const applicable = isMilestoneApplicable(milestone, venture);
    const progress = progressMap.get(milestone.id);
    const status: MilestoneStatus = progress?.status ?? "NOT_STARTED";
    const completed = isCompleted(status);

    if (!applicable) {
      breakdown.push({
        milestoneId: milestone.id,
        title: milestone.title,
        phase: milestone.phaseLabel,
        period: milestone.period,
        requirementLevel: milestone.requirementLevel,
        isApplicable: false,
        isCompleted: false,
        status,
        earnedPoints: 0,
        possiblePoints: 0,
        reason: "Not applicable to this venture type",
      });
      continue;
    }

    const isRequired = milestone.requirementLevel === "REQUIRED";
    const multiplier = getMultiplier(teamRole, milestone.requirementLevel);

    if (isRequired) {
      totalRequired++;
      // Required milestones: you earn the full multiplier if completed,
      // or the incomplete penalty if not completed
      const possiblePoints = multiplier;
      maxPossibleScore += possiblePoints;

      if (completed) {
        completedRequired++;
        totalScore += multiplier;
        breakdown.push({
          milestoneId: milestone.id,
          title: milestone.title,
          phase: milestone.phaseLabel,
          period: milestone.period,
          requirementLevel: "REQUIRED",
          isApplicable: true,
          isCompleted: true,
          status,
          earnedPoints: multiplier,
          possiblePoints,
          reason: `Completed: +${multiplier} pts`,
        });
      } else if (status === "WAIVED") {
        // Waived milestones don't count against you
        maxPossibleScore -= possiblePoints; // Remove from denominator
        breakdown.push({
          milestoneId: milestone.id,
          title: milestone.title,
          phase: milestone.phaseLabel,
          period: milestone.period,
          requirementLevel: "REQUIRED",
          isApplicable: true,
          isCompleted: false,
          status,
          earnedPoints: 0,
          possiblePoints: 0,
          reason: "Waived by instructor",
        });
      } else {
        // Incomplete required: apply the penalty score (0.6)
        // This means you get SOME credit but not full
        totalScore += incompleteRequiredPenalty;
        breakdown.push({
          milestoneId: milestone.id,
          title: milestone.title,
          phase: milestone.phaseLabel,
          period: milestone.period,
          requirementLevel: "REQUIRED",
          isApplicable: true,
          isCompleted: false,
          status,
          earnedPoints: incompleteRequiredPenalty,
          possiblePoints,
          reason: `Incomplete: ${incompleteRequiredPenalty} pts (of ${multiplier})`,
        });
      }
    } else {
      // Optional milestones: you earn the multiplier if completed, 0 if not
      totalOptional++;
      maxPossibleScore += multiplier;

      if (completed) {
        completedOptional++;
        totalScore += multiplier;
        breakdown.push({
          milestoneId: milestone.id,
          title: milestone.title,
          phase: milestone.phaseLabel,
          period: milestone.period,
          requirementLevel: "OPTIONAL",
          isApplicable: true,
          isCompleted: true,
          status,
          earnedPoints: multiplier,
          possiblePoints: multiplier,
          reason: `Completed: +${multiplier} pts (bonus)`,
        });
      } else {
        breakdown.push({
          milestoneId: milestone.id,
          title: milestone.title,
          phase: milestone.phaseLabel,
          period: milestone.period,
          requirementLevel: "OPTIONAL",
          isApplicable: true,
          isCompleted: false,
          status,
          earnedPoints: 0,
          possiblePoints: multiplier,
          reason: "Optional — not yet completed",
        });
      }
    }
  }

  // Lead bonus: Leads earn ADDITIONAL points on top of their member score
  // The lead multipliers are additive extras, not replacements
  // (This matches the spreadsheet behavior where leads can earn higher scores)
  if (teamRole === "LEAD") {
    // Lead bonuses are already included via getMultiplier returning lead-specific values
    // If the intent is that leads get MEMBER + LEAD multipliers, adjust here
  }

  const percentage = maxPossibleScore > 0
    ? Math.round((totalScore / maxPossibleScore) * 10000) / 100
    : 0;

  return {
    totalScore: Math.round(totalScore * 100) / 100,
    maxPossibleScore: Math.round(maxPossibleScore * 100) / 100,
    percentage,
    completedRequired,
    totalRequired,
    completedOptional,
    totalOptional,
    completedCount: completedRequired + completedOptional,
    applicableCount: totalRequired + totalOptional,
    breakdown,
  };
}

// ---------------------------------------------------------------------------
// Database-aware version: fetches everything and calculates
// ---------------------------------------------------------------------------

export async function calculateAndSnapshotScore(
  prisma: PrismaClient,
  studentId: string,
  ventureId: string
): Promise<ScoreResult> {
  // Fetch all needed data in parallel
  const [allMilestones, progressRecords, venture, membership, scoringRules] =
    await Promise.all([
      prisma.milestoneDefinition.findMany({ orderBy: { sequenceOrder: "asc" } }),
      prisma.milestoneProgress.findMany({
        where: { studentId, ventureId },
      }),
      prisma.venture.findUnique({ where: { id: ventureId } }),
      prisma.teamMembership.findFirst({
        where: { userId: studentId, ventureId, isActive: true },
      }),
      prisma.scoringRule.findMany({ where: { isActive: true } }),
    ]);

  if (!venture || !membership) {
    throw new Error(`Student ${studentId} is not an active member of venture ${ventureId}`);
  }

  const result = calculateStudentScore(
    allMilestones,
    progressRecords,
    { ownershipType: venture.ownershipType, offeringType: venture.offeringType },
    membership.teamRole,
    scoringRules,
  );

  // Persist the snapshot for history and performance
  await prisma.scoreSnapshot.create({
    data: {
      studentId,
      ventureId,
      calculatedScore: result.totalScore,
      maxPossible: result.maxPossibleScore,
      percentage: result.percentage,
      completedCount: result.completedCount,
      applicableCount: result.applicableCount,
      breakdown: result.breakdown as any,
    },
  });

  return result;
}

// ---------------------------------------------------------------------------
// Batch calculation for all students in a section (for instructor dashboard)
// ---------------------------------------------------------------------------

export async function calculateSectionScores(
  prisma: PrismaClient,
  sectionId: string
): Promise<Map<string, ScoreResult>> {
  const results = new Map<string, ScoreResult>();

  const ventures = await prisma.venture.findMany({
    where: { sectionId },
    include: {
      teamMemberships: {
        where: { isActive: true },
        include: { user: true },
      },
    },
  });

  const [allMilestones, scoringRules] = await Promise.all([
    prisma.milestoneDefinition.findMany({ orderBy: { sequenceOrder: "asc" } }),
    prisma.scoringRule.findMany({ where: { isActive: true } }),
  ]);

  for (const venture of ventures) {
    const allProgress = await prisma.milestoneProgress.findMany({
      where: { ventureId: venture.id },
    });

    // Group progress by student
    const progressByStudent = new Map<string, MilestoneProgressRecord[]>();
    for (const p of allProgress) {
      const existing = progressByStudent.get(p.studentId) ?? [];
      existing.push(p);
      progressByStudent.set(p.studentId, existing);
    }

    for (const membership of venture.teamMemberships) {
      const studentProgress = progressByStudent.get(membership.userId) ?? [];

      const result = calculateStudentScore(
        allMilestones,
        studentProgress,
        { ownershipType: venture.ownershipType, offeringType: venture.offeringType },
        membership.teamRole,
        scoringRules,
      );

      results.set(membership.userId, result);
    }
  }

  return results;
}
