"use client";

import { useState } from "react";
import { ScoringRule } from "@prisma/client";

interface ScoringRulesEditorProps {
  rules: ScoringRule[];
}

export default function ScoringRulesEditor({ rules }: ScoringRulesEditorProps) {
  const [editedRules, setEditedRules] = useState<Record<string, number>>(
    rules.reduce(
      (acc, rule) => ({
        ...acc,
        [rule.id]: rule.multiplier,
      }),
      {}
    )
  );
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const handleMultiplierChange = (ruleId: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setEditedRules((prev) => ({
      ...prev,
      [ruleId]: numValue,
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);

    try {
      const rulesArray = Object.entries(editedRules).map(([id, multiplier]) => ({
        id,
        multiplier,
      }));

      const response = await fetch("/api/settings/scoring-rules", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ rules: rulesArray }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to save scoring rules");
      }

      setMessage({
        type: "success",
        text: "Scoring rules updated successfully.",
      });
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error ? error.message : "An error occurred while saving.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = Object.some(
    (id: string) => editedRules[id] !== rules.find((r) => r.id === id)?.multiplier,
    Object.keys(editedRules)
  );

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                Label
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                Team Role
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                Requirement
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                Multiplier
              </th>
            </tr>
          </thead>
          <tbody>
            {rules.map((rule) => (
              <tr key={rule.id} className="border-b border-gray-100">
                <td className="px-4 py-3 text-sm text-gray-900">{rule.label}</td>
                <td className="px-4 py-3 text-sm text-gray-900">{rule.teamRole}</td>
                <td className="px-4 py-3 text-sm text-gray-900">{rule.requirement}</td>
                <td className="px-4 py-3 text-sm">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editedRules[rule.id] || 0}
                    onChange={(e) => handleMultiplierChange(rule.id, e.target.value)}
                    className="w-20 rounded border border-gray-300 px-2 py-1 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {message && (
        <div
          className={`rounded-lg px-4 py-3 text-sm ${
            message.type === "success"
              ? "bg-green-50 text-green-800"
              : "bg-red-50 text-red-800"
          }`}
        >
          {message.text}
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={isSaving || !hasChanges}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 hover:bg-blue-700"
      >
        {isSaving ? "Saving..." : "Save Changes"}
      </button>
    </div>
  );
}
