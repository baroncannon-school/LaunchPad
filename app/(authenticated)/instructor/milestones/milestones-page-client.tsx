"use client";

import { useState } from "react";
import { MilestoneDefinitionEditor } from "@/components/milestones/milestone-definition-editor";

type MilestoneDefinition = {
  id: string;
  title: string;
  description: string | null;
  period: string;
  ownershipFilter: string;
  requirementLevel: string;
  offeringFilter: string;
  sequenceOrder: number;
  evidenceRequired: boolean;
  evidenceType: string;
  phaseLabel: string | null;
  guidanceText: string | null;
};

export function MilestonesPageClient({
  milestones,
}: {
  milestones: MilestoneDefinition[];
}) {
  const [view, setView] = useState<"overview" | "editor">("overview");

  // Group by phase for overview
  const grouped = new Map<string, MilestoneDefinition[]>();
  for (const m of milestones) {
    const phase = m.phaseLabel ?? "Other";
    if (!grouped.has(phase)) grouped.set(phase, []);
    grouped.get(phase)!.push(m);
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Milestone Definitions
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {milestones.length} milestones defined across {grouped.size} phases.
          </p>
        </div>
        <div className="flex bg-gray-100 rounded-lg p-0.5">
          <button
            onClick={() => setView("overview")}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              view === "overview"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setView("editor")}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              view === "editor"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Editor
          </button>
        </div>
      </div>

      {view === "editor" ? (
        <MilestoneDefinitionEditor initialMilestones={milestones} />
      ) : (
        <div className="space-y-6">
          {Array.from(grouped.entries()).map(([phase, phaseMilestones]) => (
            <div
              key={phase}
              className="rounded-xl border border-gray-200 bg-white overflow-hidden"
            >
              <div className="px-5 py-3 bg-gray-50 border-b border-gray-200">
                <h2 className="font-semibold text-gray-700">{phase}</h2>
                <p className="text-xs text-gray-500">
                  {phaseMilestones.length} milestones
                </p>
              </div>
              <div className="divide-y divide-gray-100">
                {phaseMilestones.map((m) => (
                  <div key={m.id} className="px-5 py-3 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900">
                            {m.title}
                          </span>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                              m.requirementLevel === "REQUIRED"
                                ? "bg-red-50 text-red-600"
                                : "bg-gray-100 text-gray-500"
                            }`}
                          >
                            {m.requirementLevel}
                          </span>
                        </div>
                        <div className="flex gap-3 mt-1 text-xs text-gray-400">
                          <span>{m.period.replace("_", " ")}</span>
                          <span>Ownership: {m.ownershipFilter}</span>
                          <span>Offering: {m.offeringFilter}</span>
                          {m.evidenceType !== "NONE" && (
                            <span className="text-blue-500">
                              Evidence: {m.evidenceType}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-xs text-gray-400 ml-4">
                        #{m.sequenceOrder}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
