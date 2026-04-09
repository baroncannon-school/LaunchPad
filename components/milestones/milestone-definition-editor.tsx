"use client";

import { useState, useCallback, useEffect } from "react";

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

const PERIODS = [
  { value: "P1_NOV", label: "Nov (P1)" },
  { value: "P2_DEC", label: "Dec (P2)" },
  { value: "P3_JAN", label: "Jan (P3)" },
  { value: "P4_FEB", label: "Feb (P4)" },
  { value: "P5_MAR", label: "Mar (P5)" },
  { value: "P6_APR", label: "Apr (P6)" },
  { value: "P7_MAY", label: "May (P7)" },
  { value: "P8_OTHER", label: "Other" },
];

const OWNERSHIP = [
  { value: "SCHOOL", label: "School" },
  { value: "SELF", label: "Self" },
  { value: "BOTH", label: "Both" },
];

const OFFERING = [
  { value: "PRODUCT", label: "Product" },
  { value: "SERVICE", label: "Service" },
  { value: "BOTH", label: "Both" },
];

const REQUIREMENT = [
  { value: "REQUIRED", label: "Required" },
  { value: "OPTIONAL", label: "Optional" },
];

const EVIDENCE_TYPES = [
  { value: "NONE", label: "None" },
  { value: "FILE", label: "File" },
  { value: "LINK", label: "Link" },
  { value: "TEXT", label: "Text" },
];

type EditingCell = {
  id: string;
  field: keyof MilestoneDefinition;
} | null;

export function MilestoneDefinitionEditor({
  initialMilestones,
}: {
  initialMilestones: MilestoneDefinition[];
}) {
  const [milestones, setMilestones] = useState<MilestoneDefinition[]>(initialMilestones);
  const [editingCell, setEditingCell] = useState<EditingCell>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [saving, setSaving] = useState<string | null>(null);
  const [savedRecently, setSavedRecently] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  // Save a single field update
  const saveField = useCallback(
    async (id: string, field: string, value: string | boolean | number) => {
      setSaving(id);
      setError(null);
      try {
        const res = await fetch("/api/milestones/definitions", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, [field]: value }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to save");
        }
        const updated = await res.json();
        setMilestones((prev) =>
          prev.map((m) => (m.id === id ? { ...m, ...updated } : m))
        );
        setSavedRecently(id);
        setTimeout(() => setSavedRecently(null), 1500);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setSaving(null);
      }
    },
    []
  );

  // Handle inline text editing
  const startEditing = (id: string, field: keyof MilestoneDefinition, currentValue: string) => {
    setEditingCell({ id, field });
    setEditValue(currentValue || "");
  };

  const commitEdit = () => {
    if (!editingCell) return;
    const milestone = milestones.find((m) => m.id === editingCell.id);
    if (!milestone) return;

    const oldValue = String(milestone[editingCell.field] ?? "");
    if (editValue !== oldValue) {
      saveField(editingCell.id, editingCell.field, editValue);
    }
    setEditingCell(null);
  };

  const cancelEdit = () => {
    setEditingCell(null);
  };

  // Handle select changes (instant save)
  const handleSelectChange = (id: string, field: string, value: string) => {
    // Optimistic update
    setMilestones((prev) =>
      prev.map((m) => (m.id === id ? { ...m, [field]: value } : m))
    );
    saveField(id, field, value);
  };

  // Drag and drop reorder
  const handleDragStart = (id: string) => {
    setDraggedId(id);
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (id !== draggedId) setDragOverId(id);
  };

  const handleDrop = async (targetId: string) => {
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }

    const newOrder = [...milestones];
    const dragIdx = newOrder.findIndex((m) => m.id === draggedId);
    const dropIdx = newOrder.findIndex((m) => m.id === targetId);
    const [moved] = newOrder.splice(dragIdx, 1);
    newOrder.splice(dropIdx, 0, moved);

    // Update sequence orders
    const reordered = newOrder.map((m, i) => ({
      ...m,
      sequenceOrder: i + 1,
    }));
    setMilestones(reordered);
    setDraggedId(null);
    setDragOverId(null);

    // Save to server
    try {
      const res = await fetch("/api/milestones/definitions/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds: reordered.map((m) => m.id) }),
      });
      if (!res.ok) throw new Error("Failed to save order");
    } catch {
      setError("Failed to save new order");
    }
  };

  // Keyboard handling for edit cells
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (editingCell) {
        if (e.key === "Escape") cancelEdit();
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          commitEdit();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  const SelectCell = ({
    milestone,
    field,
    options,
  }: {
    milestone: MilestoneDefinition;
    field: keyof MilestoneDefinition;
    options: { value: string; label: string }[];
  }) => (
    <select
      value={String(milestone[field])}
      onChange={(e) => handleSelectChange(milestone.id, field, e.target.value)}
      className="w-full bg-transparent text-xs border-0 p-0 focus:ring-1 focus:ring-blue-400 rounded cursor-pointer"
      disabled={saving === milestone.id}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );

  const TextCell = ({
    milestone,
    field,
    placeholder,
  }: {
    milestone: MilestoneDefinition;
    field: keyof MilestoneDefinition;
    placeholder?: string;
  }) => {
    const isEditing =
      editingCell?.id === milestone.id && editingCell?.field === field;
    const value = String(milestone[field] ?? "");

    if (isEditing) {
      return (
        <input
          type="text"
          autoFocus
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={commitEdit}
          className="w-full text-xs border border-blue-400 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
        />
      );
    }

    return (
      <div
        onClick={() => startEditing(milestone.id, field, value)}
        className="text-xs cursor-text truncate hover:bg-blue-50 rounded px-1 py-0.5 min-h-[22px]"
        title={value || placeholder}
      >
        {value || (
          <span className="text-gray-300 italic">{placeholder || "Click to edit"}</span>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Milestone Definition Editor
          </h2>
          <p className="text-sm text-gray-500">
            Click any cell to edit. Changes save automatically. Drag rows to
            reorder.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {error && (
            <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
              {error}
            </span>
          )}
          <span className="text-xs text-gray-400">
            {milestones.length} milestones
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="w-8 px-2 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                  #
                </th>
                <th className="px-3 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider min-w-[240px]">
                  Step / Milestone
                </th>
                <th className="px-2 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider w-[100px]">
                  Period
                </th>
                <th className="px-2 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider w-[90px]">
                  Ownership
                </th>
                <th className="px-2 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider w-[90px]">
                  Required
                </th>
                <th className="px-2 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider w-[90px]">
                  Offering
                </th>
                <th className="px-2 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider w-[120px]">
                  Phase
                </th>
                <th className="px-2 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider w-[80px]">
                  Evidence
                </th>
                <th className="w-8 px-2 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {milestones.map((m) => (
                <tr
                  key={m.id}
                  draggable
                  onDragStart={() => handleDragStart(m.id)}
                  onDragOver={(e) => handleDragOver(e, m.id)}
                  onDrop={() => handleDrop(m.id)}
                  onDragEnd={() => {
                    setDraggedId(null);
                    setDragOverId(null);
                  }}
                  className={`group transition-colors ${
                    draggedId === m.id
                      ? "opacity-50 bg-blue-50"
                      : dragOverId === m.id
                      ? "bg-blue-100 border-t-2 border-blue-400"
                      : "hover:bg-gray-50"
                  } ${
                    saving === m.id
                      ? "opacity-70"
                      : savedRecently === m.id
                      ? "bg-green-50"
                      : ""
                  }`}
                >
                  {/* Sequence # / drag handle */}
                  <td className="px-2 py-1.5 text-xs text-gray-400 cursor-grab active:cursor-grabbing">
                    <div className="flex items-center gap-1">
                      <svg
                        className="w-3 h-3 text-gray-300 opacity-0 group-hover:opacity-100"
                        fill="currentColor"
                        viewBox="0 0 16 16"
                      >
                        <circle cx="5" cy="3" r="1.5" />
                        <circle cx="11" cy="3" r="1.5" />
                        <circle cx="5" cy="8" r="1.5" />
                        <circle cx="11" cy="8" r="1.5" />
                        <circle cx="5" cy="13" r="1.5" />
                        <circle cx="11" cy="13" r="1.5" />
                      </svg>
                      {m.sequenceOrder}
                    </div>
                  </td>

                  {/* Title */}
                  <td className="px-3 py-1.5">
                    <TextCell
                      milestone={m}
                      field="title"
                      placeholder="Milestone title"
                    />
                  </td>

                  {/* Period */}
                  <td className="px-2 py-1.5">
                    <SelectCell
                      milestone={m}
                      field="period"
                      options={PERIODS}
                    />
                  </td>

                  {/* Ownership */}
                  <td className="px-2 py-1.5">
                    <SelectCell
                      milestone={m}
                      field="ownershipFilter"
                      options={OWNERSHIP}
                    />
                  </td>

                  {/* Requirement */}
                  <td className="px-2 py-1.5">
                    <SelectCell
                      milestone={m}
                      field="requirementLevel"
                      options={REQUIREMENT}
                    />
                  </td>

                  {/* Offering */}
                  <td className="px-2 py-1.5">
                    <SelectCell
                      milestone={m}
                      field="offeringFilter"
                      options={OFFERING}
                    />
                  </td>

                  {/* Phase */}
                  <td className="px-2 py-1.5">
                    <TextCell
                      milestone={m}
                      field="phaseLabel"
                      placeholder="Phase label"
                    />
                  </td>

                  {/* Evidence Type */}
                  <td className="px-2 py-1.5">
                    <SelectCell
                      milestone={m}
                      field="evidenceType"
                      options={EVIDENCE_TYPES}
                    />
                  </td>

                  {/* Expand button */}
                  <td className="px-2 py-1.5">
                    <button
                      onClick={() =>
                        setExpandedRow(expandedRow === m.id ? null : m.id)
                      }
                      className="text-gray-400 hover:text-gray-600 p-0.5 rounded"
                      title="Show details"
                    >
                      <svg
                        className={`w-4 h-4 transition-transform ${
                          expandedRow === m.id ? "rotate-180" : ""
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Expanded detail panel — rendered outside table for simplicity */}
      {expandedRow && (
        <ExpandedPanel
          milestone={milestones.find((m) => m.id === expandedRow)!}
          onSave={saveField}
          onClose={() => setExpandedRow(null)}
          saving={saving === expandedRow}
        />
      )}
    </div>
  );
}

function ExpandedPanel({
  milestone,
  onSave,
  onClose,
  saving,
}: {
  milestone: MilestoneDefinition;
  onSave: (id: string, field: string, value: string | boolean) => void;
  onClose: () => void;
  saving: boolean;
}) {
  const [desc, setDesc] = useState(milestone.description || "");
  const [guidance, setGuidance] = useState(milestone.guidanceText || "");
  const [evidenceReq, setEvidenceReq] = useState(milestone.evidenceRequired);

  return (
    <div className="border border-blue-200 rounded-xl bg-blue-50/50 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-800">
          Details: {milestone.title}
        </h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-xs"
        >
          Close
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Description
          </label>
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            onBlur={() => {
              if (desc !== (milestone.description || "")) {
                onSave(milestone.id, "description", desc);
              }
            }}
            rows={3}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-1 focus:ring-blue-400 focus:border-blue-400"
            placeholder="Describe what this milestone involves..."
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Guidance Text (shown to students)
          </label>
          <textarea
            value={guidance}
            onChange={(e) => setGuidance(e.target.value)}
            onBlur={() => {
              if (guidance !== (milestone.guidanceText || "")) {
                onSave(milestone.id, "guidanceText", guidance);
              }
            }}
            rows={3}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-1 focus:ring-blue-400 focus:border-blue-400"
            placeholder="Tips or instructions for completing this milestone..."
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={evidenceReq}
            onChange={(e) => {
              setEvidenceReq(e.target.checked);
              onSave(milestone.id, "evidenceRequired", e.target.checked);
            }}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-400"
          />
          Evidence required for verification
        </label>
        {saving && (
          <span className="text-xs text-blue-500 animate-pulse">Saving...</span>
        )}
      </div>
    </div>
  );
}
