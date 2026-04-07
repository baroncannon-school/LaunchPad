"use client";

import { useState } from "react";
import { calculateStudentScore, type ScoreResult } from "@/lib/scoring";

// ============================================================================
// What-If Score Calculator Component
//
// Client-side component that allows students to see projected scores
// if they complete various incomplete milestones.
// ============================================================================

interface MilestoneDefinition {
  id: string;
  title: string;
  period: string;
  ownershipFilter: string;
  requirementLevel: "REQUIRED" | "OPTIONAL";
  offeringFilter: string;
  sequenceOrder: number;
  phaseLabel: string | null;
}

interface MilestoneProgressRecord {
  milestoneDefinitionId: string;
  status: string;
}

interface ScoringRule {
  teamRole: "LEAD" | "MEMBER";
  requirement: "REQUIRED" | "OPTIONAL";
  multiplier: number;
}

interface VentureContext {
  ownershipType: "SCHOOL" | "SELF" | "BOTH";
  offeringType: "PRODUCT" | "SERVICE" | "BOTH";
}

interface MilestoneScoreDetail {
  milestoneId: string;
  title: string;
  phase: string | null;
  period: string;
  requirementLevel: "REQUIRED" | "OPTIONAL";
  isApplicable: boolean;
  isCompleted: boolean;
  status: string;
  earnedPoints: number;
  possiblePoints: number;
  reason: string;
}

interface WhatIfCalculatorProps {
  allMilestones: MilestoneDefinition[];
  progressRecords: MilestoneProgressRecord[];
  venture: VentureContext;
  teamRole: "LEAD" | "MEMBER";
  scoringRules: ScoringRule[];
  currentScore: ScoreResult;
  incompleteApplicable: MilestoneScoreDetail[];
}

export function WhatIfCalculator({
  allMilestones,
  progressRecords,
  venture,
  teamRole,
  scoringRules,
  currentScore,
  incompleteApplicable,
}: WhatIfCalculatorProps) {
  // Track which milestones the user is hypothetically completing
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Calculate projected score based on selected milestones
  const projectedScore = calculateProjectedScore(
    allMilestones,
    progressRecords,
    venture,
    teamRole,
    scoringRules,
    selected
  );

  const scoreDelta = projectedScore.totalScore - currentScore.totalScore;
  const percentageDelta = projectedScore.percentage - currentScore.percentage;

  const toggleMilestone = (milestoneId: string) => {
    const newSelected = new Set(selected);
    if (newSelected.has(milestoneId)) {
      newSelected.delete(milestoneId);
    } else {
      newSelected.add(milestoneId);
    }
    setSelected(newSelected);
  };

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50 p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-2">What-If Calculator</h2>
      <p className="text-sm text-gray-700 mb-6">
        Explore how completing upcoming milestones would affect your score. Select any incomplete milestone to see your projected score.
      </p>

      {/* Projected Score Display */}
      {selected.size > 0 && (
        <div className="mb-6 p-4 bg-white rounded-lg border border-blue-200">
          <div className="flex items-baseline gap-4">
            <div>
              <p className="text-xs text-gray-600 uppercase tracking-wide font-semibold">
                Projected Score
              </p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {projectedScore.totalScore.toFixed(2)} /{" "}
                {projectedScore.maxPossibleScore.toFixed(2)}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                {projectedScore.percentage.toFixed(1)}%
              </p>
            </div>
            <div>
              <div
                className={`text-xl font-bold ${
                  scoreDelta >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {scoreDelta >= 0 ? "+" : ""}{scoreDelta.toFixed(2)} points
              </div>
              <div
                className={`text-sm ${
                  percentageDelta >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {percentageDelta >= 0 ? "+" : ""}{percentageDelta.toFixed(1)}%
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Milestone Checklist */}
      <div className="space-y-2">
        {incompleteApplicable.map((milestone) => {
          const isSelected = selected.has(milestone.milestoneId);
          const earnedIfCompleted = milestone.possiblePoints;
          const currentEarned = milestone.earnedPoints;
          const pointGain = earnedIfCompleted - currentEarned;

          return (
            <button
              key={milestone.milestoneId}
              onClick={() => toggleMilestone(milestone.milestoneId)}
              className={`w-full flex items-start gap-3 p-3 rounded-lg border-2 transition-colors text-left ${
                isSelected
                  ? "bg-white border-blue-500"
                  : "bg-white border-gray-200 hover:border-blue-300"
              }`}
            >
              {/* Checkbox */}
              <div className="flex-shrink-0 mt-1">
                <div
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                    isSelected
                      ? "bg-blue-500 border-blue-500"
                      : "border-gray-300 bg-white"
                  }`}
                >
                  {isSelected && (
                    <svg
                      className="w-3 h-3 text-white"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </div>
              </div>

              {/* Milestone info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <p className="font-medium text-gray-900">{milestone.title}</p>
                  <span className="text-xs text-gray-500">{milestone.period}</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {milestone.requirementLevel === "REQUIRED" ? (
                    <span className="font-semibold">Required milestone</span>
                  ) : (
                    <span>Bonus milestone</span>
                  )}
                </p>
              </div>

              {/* Points delta */}
              <div className="flex-shrink-0 text-right">
                {isSelected ? (
                  <div className="text-green-600 font-semibold">
                    {pointGain > 0 && "+"}
                    {pointGain.toFixed(2)}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">
                    {pointGain > 0 && "+"}
                    {pointGain.toFixed(2)} pts
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Clear selection button */}
      {selected.size > 0 && (
        <button
          onClick={() => setSelected(new Set())}
          className="mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          Clear selection
        </button>
      )}

      {/* Empty state */}
      {incompleteApplicable.length === 0 && (
        <p className="text-sm text-gray-600 italic">
          All applicable milestones are already complete!
        </p>
      )}
    </div>
  );
}

// ============================================================================
// Helper: Calculate projected score with hypothetical completions
// ============================================================================

function calculateProjectedScore(
  allMilestones: MilestoneDefinition[],
  originalProgressRecords: MilestoneProgressRecord[],
  venture: VentureContext,
  teamRole: "LEAD" | "MEMBER",
  scoringRules: ScoringRule[],
  hypotheticalCompletions: Set<string>
): ScoreResult {
  // Create a modified progress array where selected milestones are marked as VERIFIED
  const modifiedProgress = originalProgressRecords.map((p) => ({
    ...p,
    status: hypotheticalCompletions.has(p.milestoneDefinitionId)
      ? "VERIFIED"
      : p.status,
  }));

  // Recalculate with modified progress
  return calculateStudentScore(
    allMilestones,
    modifiedProgress,
    venture,
    teamRole,
    scoringRules
  );
}
