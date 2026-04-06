"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface ViewAsStudentButtonProps {
    studentId: string;
    studentName: string;
    variant?: "icon" | "button";
}

  export function ViewAsStudentButton({
      studentId,
      studentName,
      variant = "icon",
  }: ViewAsStudentButtonProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    async function handleClick() {
      setLoading(true);
      const res = await fetch("/api/impersonate", {
              method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId }),
      });

      if (res.ok) {
        router.push("/student/dashboard");
      } else {
        setLoading(false);
        alert("Could not view as this student. Please try again.");
      }
        }

        if (variant === "button") {
          return (
                  <button
            onClick={handleClick}
            disabled={loading}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-700 hover:bg-amber-100 transition-colors disabled:opacity-50"
            title={`View dashboard as ${studentName}`}
                  >
                    <EyeIcon />
            {loading ? "Loading..." : "View as Student"}
                  </button>
          );
        }

          return (
                <button
            onClick={handleClick}
            disabled={loading}
                  className="rounded-md p-1 text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors disabled:opacity-50"
            title={`View dashboard as ${studentName}`}
                >
                  <EyeIcon />
                </button>
          );
    }

      function EyeIcon() {
        return (
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
          strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
          strokeLinejoin="round"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
          strokeLinejoin="round"
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
        );
      }
