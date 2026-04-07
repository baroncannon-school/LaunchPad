"use client";

import { useState, useRef, useEffect } from "react";

interface GradeRecord {
  id: string;
  score: number;
  maxScore: number;
}

interface GradeCellProps {
  studentId: string;
  semesterConfigId: string;
  category: string;
  records: GradeRecord[];
  totalScore: number;
  totalMax: number;
}

export function GradeCell({
  studentId,
  semesterConfigId,
  category,
  records,
  totalScore,
  totalMax,
}: GradeCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [scoreInput, setScoreInput] = useState(totalScore.toString());
  const [maxScoreInput, setMaxScoreInput] = useState(totalMax.toString());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const percentage = totalMax > 0 ? (totalScore / totalMax) * 100 : 0;

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const score = parseFloat(scoreInput) || 0;
      const maxScore = parseFloat(maxScoreInput) || 0;

      if (maxScore <= 0) {
        alert("Max score must be greater than 0");
        setIsLoading(false);
        return;
      }

      const response = await fetch("/api/gradebook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          semesterConfigId,
          category,
          score,
          maxScore,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(`Error saving grade: ${error.error || "Unknown error"}`);
        return;
      }

      setIsEditing(false);
      // Reload the page to reflect changes
      window.location.reload();
    } catch (error) {
      console.error("Error saving grade:", error);
      alert("Failed to save grade");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      setIsEditing(false);
      setScoreInput(totalScore.toString());
      setMaxScoreInput(totalMax.toString());
    }
  };

  if (isEditing) {
    return (
      <div className="space-y-2">
        <div className="flex gap-1">
          <input
            ref={inputRef}
            type="number"
            step="0.01"
            value={scoreInput}
            onChange={(e) => setScoreInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            className="w-12 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="0"
          />
          <span className="text-sm text-gray-500">/</span>
          <input
            type="number"
            step="0.01"
            value={maxScoreInput}
            onChange={(e) => setMaxScoreInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            className="w-12 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="100"
          />
        </div>
        <div className="flex gap-1">
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? "..." : "✓"}
          </button>
          <button
            onClick={() => {
              setIsEditing(false);
              setScoreInput(totalScore.toString());
              setMaxScoreInput(totalMax.toString());
            }}
            disabled={isLoading}
            className="px-2 py-1 bg-gray-300 text-gray-700 text-xs rounded hover:bg-gray-400 disabled:opacity-50"
          >
            ✕
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setIsEditing(true)}
      className="inline-block px-3 py-1 rounded bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition cursor-pointer"
    >
      {totalScore}/{totalMax}
      <div className="text-xs text-gray-500">{Math.round(percentage)}%</div>
    </button>
  );
}
