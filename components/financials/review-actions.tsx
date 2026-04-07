"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface FinancialReviewActionsProps {
  statementId: string;
  isRevision?: boolean;
}

export default function FinancialReviewActions({
  statementId,
  isRevision = false,
}: FinancialReviewActionsProps) {
  const router = useRouter();
  const [showRevisionForm, setShowRevisionForm] = useState(false);
  const [revisionFeedback, setRevisionFeedback] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAccept = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/financials/${statementId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "ACCEPTED",
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to accept statement");
      }

      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An error occurred"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRequestRevision = async () => {
    if (!revisionFeedback.trim()) {
      setError("Please provide feedback for revision");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/financials/${statementId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "REVISION_REQUESTED",
          feedback: revisionFeedback,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to request revision");
      }

      router.refresh();
      setShowRevisionForm(false);
      setRevisionFeedback("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An error occurred"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3 border-t border-current border-opacity-10 pt-3 mt-3">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-2">
          <p className="text-xs text-red-800">{error}</p>
        </div>
      )}

      {!showRevisionForm ? (
        <div className="flex gap-2">
          <button
            onClick={handleAccept}
            disabled={loading}
            className="flex-1 px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Processing..." : "Accept"}
          </button>
          <button
            onClick={() => setShowRevisionForm(true)}
            disabled={loading || showRevisionForm}
            className="flex-1 px-3 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            Request Revision
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <textarea
            value={revisionFeedback}
            onChange={(e) => setRevisionFeedback(e.target.value)}
            placeholder="Provide feedback on what needs to be revised..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
          />
          <div className="flex gap-2">
            <button
              onClick={handleRequestRevision}
              disabled={loading || !revisionFeedback.trim()}
              className="flex-1 px-3 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Sending..." : "Send Revision Request"}
            </button>
            <button
              onClick={() => {
                setShowRevisionForm(false);
                setRevisionFeedback("");
              }}
              disabled={loading}
              className="flex-1 px-3 py-2 bg-gray-300 text-gray-900 text-sm font-medium rounded-lg hover:bg-gray-400 disabled:bg-gray-200 disabled:cursor-not-allowed transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
