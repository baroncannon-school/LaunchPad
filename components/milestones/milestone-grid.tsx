"use client";

import { useState, useCallback, useTransition } from "react";

// ---------- Types ----------
type MilestoneStatus = "NOT_STARTED" | "IN_PROGRESS" | "SUBMITTED" | "VERIFIED" | "WAIVED";

interface MilestoneDefinition {
  id: string;
  title: string;
  period: string;
  phaseLabel: string | null;
  requirementLevel: "REQUIRED" | "OPTIONAL";
  ownershipFilter: string;
  offeringFilter: string;
  sequenceOrder: number;
}

interface TeamMember {
  userId: string;
  firstName: string;
  lastName: string;
  teamRole: "LEAD" | "MEMBER";
}

interface ProgressRecord {
  id: string;
  studentId: string;
  milestoneDefinitionId: string;
  status: MilestoneStatus;
}

interface MilestoneGridProps {
  milestones: MilestoneDefinition[];
  members: TeamMember[];
  progress: ProgressRecord[];
  ventureId: string;
  ownershipType: string;
  offeringType: string;
}

// ---------- Status cycle & display ----------
const STATUS_ORDER: MilestoneStatus[] = [
  "NOT_STARTED",
  "IN_PROGRESS",
  "SUBMITTED",
  "VERIFIED",
  "WAIVED",
];

const STATUS_CONFIG: Record<
  MilestoneStatus,
  { label: string; abbr: string; bg: string; text: string; ring: string }
> = {
  NOT_STARTED: { label: "Not Started", abbr: "—", bg: "bg-gray-100", text: "text-gray-400", ring: "ring-gray-200" },
  IN_PROGRESS: { label: "In Progress", abbr: "IP", bg: "bg-yellow-100", text: "text-yellow-700", ring: "ring-yellow-300" },
  SUBMITTED: { label: "Submitted", abbr: "SUB", bg: "bg-blue-100", text: "text-blue-700", ring: "ring-blue-300" },
  VERIFIED: { label: "Verified", abbr: "✓", bg: "bg-green-100", text: "text-green-700", ring: "ring-green-400" },
  WAIVED: { label: "Waived", abbr: "W", bg: "bg-purple-100", text: "text-purple-700", ring: "ring-purple-300" },
};

function nextStatus(current: MilestoneStatus): MilestoneStatus {
  const idx = STATUS_ORDER.indexOf(current);
  return STATUS_ORDER[(idx + 1) % STATUS_ORDER.length];
}

// ---------- Filtering ----------
function isMilestoneApplicable(
  m: MilestoneDefinition,
  ownershipType: string,
  offeringType: string
): boolean {
  if (m.ownershipFilter !== "BOTH") {
    if (m.ownershipFilter === "SCHOOL" && ownershipType !== "SCHOOL") return false;
    if (m.ownershipFilter === "SELF" && ownershipType !== "SELF") return false;
  }
  if (m.offeringFilter !== "BOTH") {
    if (m.offeringFilter === "PRODUCT" && offeringType === "SERVICE") return false;
    if (m.offeringFilter === "SERVICE" && offeringType === "PRODUCT") return false;
  }
  return true;
}

// ---------- Main Component ----------
export function MilestoneGrid({
  milestones,
  members,
  progress,
  ventureId,
  ownershipType,
  offeringType,
}: MilestoneGridProps) {
  // Filter milestones applicable to this venture
  const applicableMilestones = milestones.filter((m) =>
    isMilestoneApplicable(m, ownershipType, offeringType)
  );

  // State: map of "studentId:milestoneDefId" → status
  const [statusMap, setStatusMap] = useState<Map<string, MilestoneStatus>>(() => {
    const map = new Map<string, MilestoneStatus>();
    for (const p of progress) {
      map.set(`${p.studentId}:${p.milestoneDefinitionId}`, p.status);
    }
    return map;
  });

  // Track which cells are saving
  const [saving, setSaving] = useState<Set<string>>(new Set());

  // Filters
  const [phaseFilter, setPhaseFilter] = useState<string>("ALL");
  const [periodFilter, setPeriodFilter] = useState<string>("ALL");
  const [reqFilter, setReqFilter] = useState<string>("ALL");

  // Get unique phases and periods
  const phases = Array.from(new Set(applicableMilestones.map((m) => m.phaseLabel ?? "Other")));
  const periods = Array.from(new Set(applicableMilestones.map((m) => m.period)));

  // Apply filters
  const filteredMilestones = applicableMilestones.filter((m) => {
    if (phaseFilter !== "ALL" && (m.phaseLabel ?? "Other") !== phaseFilter) return false;
    if (periodFilter !== "ALL" && m.period !== periodFilter) return false;
    if (reqFilter !== "ALL" && m.requirementLevel !== reqFilter) return false;
    return true;
  });

  // Group by phase for display
  const groupedByPhase = new Map<string, MilestoneDefinition[]>();
  for (const m of filteredMilestones) {
    const phase = m.phaseLabel ?? "Other";
    if (!groupedByPhase.has(phase)) groupedByPhase.set(phase, []);
    groupedByPhase.get(phase)!.push(m);
  }

  // Find the progress record ID for upsert
  const progressIdMap = new Map<string, string>();
  for (const p of progress) {
    progressIdMap.set(`${p.studentId}:${p.milestoneDefinitionId}`, p.id);
  }

  // Click handler: cycle status
  const handleCellClick = useCallback(
    async (studentId: string, milestoneDefId: string) => {
      const key = `${studentId}:${milestoneDefId}`;
      const currentStatus = statusMap.get(key) ?? "NOT_STARTED";
      const newStatus = nextStatus(currentStatus);

      // Optimistic update
      setStatusMap((prev) => {
        const next = new Map(prev);
        next.set(key, newStatus);
        return next;
      });

      setSaving((prev) => new Set(prev).add(key));

      try {
        const existingId = progressIdMap.get(key);

        if (existingId) {
          // Update existing record
          const res = await fetch(`/api/milestones/${existingId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: newStatus }),
          });
          if (!res.ok) throw new Error("Failed to update");
        } else {
          // Create via bulk endpoint
          const res = await fetch("/api/milestones/bulk-update", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              updates: [
                {
                  studentId,
                  ventureId,
                  milestoneDefinitionId: milestoneDefId,
                  status: newStatus,
                },
              ],
            }),
          });
          if (!res.ok) throw new Error("Failed to create");
          const data = await res.json();
          // Store the new ID for future updates
          if (data.results?.[0]?.id) {
            progressIdMap.set(key, data.results[0].id);
          }
        }
      } catch (err) {
        // Revert on failure
        console.error("Failed to save:", err);
        setStatusMap((prev) => {
          const next = new Map(prev);
          next.set(key, currentStatus);
          return next;
        });
      } finally {
        setSaving((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      }
    },
    [statusMap, ventureId, progressIdMap]
  );

  // Summary stats
  const totalCells = filteredMilestones.length * members.length;
  const completedCells = filteredMilestones.reduce((acc, m) => {
    return (
      acc +
      members.filter((mem) => {
        const s = statusMap.get(`${mem.userId}:${m.id}`) ?? "NOT_STARTED";
        return s === "VERIFIED" || s === "SUBMITTED";
      }).length
    );
  }, 0);

  return (
    <div>
      {/* Filters bar */}
      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">
            Phase
          </label>
          <select
            value={phaseFilter}
            onChange={(e) => setPhaseFilter(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Phases</option>
            {phases.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">
            Period
          </label>
          <select
            value={periodFilter}
            onChange={(e) => setPeriodFilter(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Periods</option>
            {periods.map((p) => (
              <option key={p} value={p}>
                {p.replace("_", " ")}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">
            Requirement
          </label>
          <select
            value={reqFilter}
            onChange={(e) => setReqFilter(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All</option>
            <option value="REQUIRED">Required</option>
            <option value="OPTIONAL">Optional</option>
          </select>
        </div>

        <div className="ml-auto text-sm text-gray-500">
          {completedCells} / {totalCells} completed ({totalCells > 0 ? Math.round((completedCells / totalCells) * 100) : 0}%)
        </div>
      </div>

      {/* Status legend */}
      <div className="flex gap-3 mb-4 text-xs">
        {STATUS_ORDER.map((s) => {
          const cfg = STATUS_CONFIG[s];
          return (
            <div key={s} className="flex items-center gap-1.5">
              <span
                className={`inline-flex items-center justify-center w-6 h-6 rounded ${cfg.bg} ${cfg.text} font-semibold text-[10px]`}
              >
                {cfg.abbr}
              </span>
              <span className="text-gray-600">{cfg.label}</span>
            </div>
          );
        })}
      </div>

      {/* Grid table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="sticky left-0 z-10 bg-gray-50 px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider min-w-[280px]">
                Milestone
              </th>
              {members.map((m) => (
                <th
                  key={m.userId}
                  className="px-2 py-3 text-center text-xs font-semibold text-gray-600 min-w-[70px]"
                >
                  <div className="truncate">
                    {m.firstName}
                    <br />
                    <span className="font-normal text-gray-400">
                      {m.lastName.charAt(0)}.
                      {m.teamRole === "LEAD" && (
                        <span className="ml-1 text-amber-500">★</span>
                      )}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from(groupedByPhase.entries()).map(([phase, phaseMilestones]) => (
              <>
                {/* Phase header row */}
                <tr key={`phase-${phase}`} className="bg-gray-50">
                  <td
                    colSpan={members.length + 1}
                    className="sticky left-0 px-4 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider"
                  >
                    {phase}
                  </td>
                </tr>

                {phaseMilestones.map((milestone) => (
                  <tr
                    key={milestone.id}
                    className="border-b border-gray-100 hover:bg-gray-50/50"
                  >
                    {/* Milestone name cell */}
                    <td className="sticky left-0 z-10 bg-white px-4 py-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-900">
                          {milestone.title}
                        </span>
                        {milestone.requirementLevel === "OPTIONAL" && (
                          <span className="shrink-0 inline-flex items-center rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">
                            OPT
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-gray-400 mt-0.5">
                        {milestone.period.replace("_", " ")}
                      </div>
                    </td>

                    {/* Status cells — one per student */}
                    {members.map((member) => {
                      const key = `${member.userId}:${milestone.id}`;
                      const status = statusMap.get(key) ?? "NOT_STARTED";
                      const cfg = STATUS_CONFIG[status];
                      const isSaving = saving.has(key);

                      return (
                        <td key={key} className="px-2 py-2 text-center">
                          <button
                            onClick={() =>
                              handleCellClick(member.userId, milestone.id)
                            }
                            disabled={isSaving}
                            title={`${cfg.label} — Click to change`}
                            className={`
                              inline-flex items-center justify-center
                              w-9 h-9 rounded-lg
                              ${cfg.bg} ${cfg.text}
                              ring-1 ${cfg.ring}
                              font-bold text-xs
                              transition-all duration-150
                              hover:scale-110 hover:shadow-md
                              active:scale-95
                              ${isSaving ? "opacity-50 animate-pulse" : ""}
                              cursor-pointer
                            `}
                          >
                            {cfg.abbr}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </>
            ))}
          </tbody>
        </table>

        {filteredMilestones.length === 0 && (
          <div className="p-8 text-center text-gray-500 text-sm">
            No milestones match the current filters.
          </div>
        )}
      </div>
    </div>
  );
}
