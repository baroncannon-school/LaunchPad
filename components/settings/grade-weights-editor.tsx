"use client";

import { useState } from "react";
import { SemesterConfig } from "@prisma/client";

type GradeWeights = Record<string, number>;

interface GradeWeightsEditorProps {
  semesterConfigs: SemesterConfig[];
}

const GRADE_CATEGORIES = [
  "EXAM",
  "QUIZ",
  "MILESTONE_TRACKER",
  "AUTHENTIC_ASSESSMENT",
  "FINAL_EXAM",
  "DESIGN_SHOWCASE",
];

const CATEGORY_LABELS: Record<string, string> = {
  EXAM: "Exam",
  QUIZ: "Quiz",
  MILESTONE_TRACKER: "Milestone Tracker",
  AUTHENTIC_ASSESSMENT: "Authentic Assessment",
  FINAL_EXAM: "Final Exam",
  DESIGN_SHOWCASE: "Design Showcase",
};

export default function GradeWeightsEditor({
  semesterConfigs,
}: GradeWeightsEditorProps) {
  const [selectedSemesterId, setSelectedSemesterId] = useState(
    semesterConfigs[0]?.id || ""
  );
  const [editedWeights, setEditedWeights] = useState<GradeWeights>(() => {
    const config = semesterConfigs.find((c) => c.id === selectedSemesterId);
    return config?.gradeWeights
      ? { ...config.gradeWeights }
      : GRADE_CATEGORIES.reduce((acc, cat) => ({ ...acc, [cat]: 0 }), {});
  });
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const handleSemesterChange = (newSemesterId: string) => {
    setSelectedSemesterId(newSemesterId);
    const config = semesterConfigs.find((c) => c.id === newSemesterId);
    setEditedWeights(
      config?.gradeWeights
        ? { ...config.gradeWeights }
        : GRADE_CATEGORIES.reduce((acc, cat) => ({ ...acc, [cat]: 0 }), {})
    );
    setMessage(null);
  };

  const handleWeightChange = (category: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setEditedWeights((prev) => ({
      ...prev,
      [category]: numValue,
    }));
  };

  const calculateTotal = (): number => {
    return Object.values(editedWeights).reduce((sum, val) => sum + val, 0);
  };

  const total = calculateTotal();
  const isValid = Math.abs(total - 100) < 0.01; // Allow for floating point errors

  const handleSave = async () => {
    if (!isValid) {
      setMessage({
        type: "error",
        text: `Weights must sum to 100% (currently ${total.toFixed(1)}%).`,
      });
      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch("/api/settings/grade-weights", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          semesterConfigId: selectedSemesterId,
          weights: editedWeights,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to save grade weights");
      }

      setMessage({
        type: "success",
        text: "Grade weights updated successfully.",
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

  const currentConfig = semesterConfigs.find((c) => c.id === selectedSemesterId);
  const hasChanges =
    JSON.stringify(editedWeights) !==
    JSON.stringify(currentConfig?.gradeWeights || {});

  return (
    <div className="space-y-4">
      {semesterConfigs.length > 1 && (
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Select Semester
          </label>
          <select
            value={selectedSemesterId}
            onChange={(e) => handleSemesterChange(e.target.value)}
            className="mt-1 rounded border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {semesterConfigs.map((config) => (
              <option key={config.id} value={config.id}>
                {config.semester} Semester ({config.startDate.toLocaleDateString()} -{" "}
                {config.endDate.toLocaleDateString()})
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                Category
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                Weight (%)
              </th>
            </tr>
          </thead>
          <tbody>
            {GRADE_CATEGORIES.map((category) => (
              <tr key={category} className="border-b border-gray-100">
                <td className="px-4 py-3 text-sm text-gray-900">
                  {CATEGORY_LABELS[category]}
                </td>
                <td className="px-4 py-3 text-sm">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={editedWeights[category] || 0}
                      onChange={(e) => handleWeightChange(category, e.target.value)}
                      className="w-20 rounded border border-gray-300 px-2 py-1 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-600">%</span>
                  </div>
                </td>
              </tr>
            ))}
            <tr className="border-t-2 border-gray-200 bg-gray-50">
              <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                Total
              </td>
              <td className="px-4 py-3 text-sm font-semibold">
                <div className="flex items-center gap-2">
                  <span
                    className={
                      isValid ? "text-green-700" : "text-red-700"
                    }
                  >
                    {total.toFixed(1)}%
                  </span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {!isValid && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
          Weights must sum to exactly 100%. Currently at {total.toFixed(1)}%.
        </div>
      )}

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
        disabled={isSaving || !hasChanges || !isValid}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 hover:bg-blue-700"
      >
        {isSaving ? "Saving..." : "Save Changes"}
      </button>
    </div>
  );
}
