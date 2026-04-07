"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface FinancialSubmissionFormProps {
  month: string;
  ventureId: string;
}

export default function FinancialSubmissionForm({
  month,
  ventureId,
}: FinancialSubmissionFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileUrl, setFileUrl] = useState("");
  const [notes, setNotes] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/financials/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ventureId,
          month,
          fileUrl: fileUrl || null,
          notes: notes || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to submit statement");
      }

      router.refresh();
      setFileUrl("");
      setNotes("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An error occurred during submission"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">
        Submit Financial Statement
      </h2>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 mb-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* File URL Input */}
        <div>
          <label
            htmlFor="fileUrl"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            File URL or Link
          </label>
          <input
            type="url"
            id="fileUrl"
            value={fileUrl}
            onChange={(e) => setFileUrl(e.target.value)}
            placeholder="https://example.com/financial-statement.pdf"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-1">
            Paste a link to your financial statement (Google Drive, Dropbox, etc.)
          </p>
        </div>

        {/* Notes Input */}
        <div>
          <label
            htmlFor="notes"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Notes (Optional)
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any notes about this financial statement..."
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Submitting..." : "Submit Financial Statement"}
        </button>
      </form>
    </div>
  );
}
