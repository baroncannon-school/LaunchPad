"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface ImpersonationBannerProps {
  studentName: string;
}

export function ImpersonationBanner({ studentName }: ImpersonationBannerProps) {
  const router = useRouter();
  const [exiting, setExiting] = useState(false);

  async function handleExit() {
    setExiting(true);
    await fetch("/api/impersonate", { method: "DELETE" });
    router.push("/instructor/students");
    router.refresh();
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-white px-4 py-2 text-center text-sm font-medium shadow-md">
      <div className="flex items-center justify-center gap-3">
        <span className="inline-flex items-center gap-1.5">
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
          Viewing as <strong>{studentName}</strong>
        </span>
        <button
          onClick={handleExit}
          disabled={exiting}
          className="ml-2 rounded-md bg-white/20 px-3 py-1 text-xs font-semibold hover:bg-white/30 transition-colors disabled:opacity-50"
        >
          {exiting ? "Exiting..." : "Exit Student View"}
        </button>
      </div>
    </div>
  );
}
