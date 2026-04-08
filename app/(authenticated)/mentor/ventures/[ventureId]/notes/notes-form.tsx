"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface NotesFormProps {
  ventureId: string;
  ventureName: string;
}

export function NotesForm({ ventureId, ventureName }: NotesFormProps) {
  const router = useRouter();
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setIsSubmitting(true);

    try {
      if (!notes.trim()) {
        setError("Please enter a note");
        setIsSubmitting(false);
        return;
      }

      const response = await fetch("/api/check-ins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ventureId,
          notes: notes.trim(),
          actionItems: null,
          nextCheckInDate: null,
          attendees: [], // No attendees for a simple note
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save note");
      }

      setSuccess(true);
      setNotes("");
      setTimeout(() => {
        setSuccess(false);
        // Reload to show the new note
        router.refresh();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="text-sm text-green-800">Note saved successfully!</p>
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          Add a Quick Note
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Record observations, follow-ups, or important details from your mentor session..."
          rows={5}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          disabled={isSubmitting}
        />
        <p className="mt-2 text-xs text-gray-500">
          This creates a simple note entry. For formal check-ins with attendance
          and action items, use "Conduct Check-in" from the venture page.
        </p>

        <div className="mt-4 flex gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? "Saving..." : "Save Note"}
          </button>
        </div>
      </div>
    </form>
  );
}
