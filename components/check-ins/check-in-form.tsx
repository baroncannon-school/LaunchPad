"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface TeamMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface ActionItem {
  text: string;
  assignee: string;
  dueDate: string;
  completed: boolean;
}

interface AttendeeRecord {
  userId: string;
  wasPresent: boolean;
}

interface CheckInFormProps {
  ventureId: string;
  ventureName: string;
  teamMembers: TeamMember[];
  redirectUrl?: string; // Optional custom redirect path
}

export function CheckInForm({
  ventureId,
  ventureName,
  teamMembers,
  redirectUrl,
}: CheckInFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [notes, setNotes] = useState("");
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [nextCheckInDate, setNextCheckInDate] = useState("");
  const [attendance, setAttendance] = useState<Record<string, boolean>>(
    teamMembers.reduce((acc, member) => ({ ...acc, [member.id]: true }), {})
  );

  const handleAddActionItem = () => {
    setActionItems([
      ...actionItems,
      { text: "", assignee: "", dueDate: "", completed: false },
    ]);
  };

  const handleRemoveActionItem = (index: number) => {
    setActionItems(actionItems.filter((_, i) => i !== index));
  };

  const handleActionItemChange = (
    index: number,
    field: keyof ActionItem,
    value: string | boolean
  ) => {
    const updated = [...actionItems];
    updated[index] = { ...updated[index], [field]: value };
    setActionItems(updated);
  };

  const handleAttendanceChange = (userId: string) => {
    setAttendance((prev) => ({
      ...prev,
      [userId]: !prev[userId],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      // Build attendees array
      const attendees: AttendeeRecord[] = teamMembers.map((member) => ({
        userId: member.id,
        wasPresent: attendance[member.id],
      }));

      const response = await fetch("/api/check-ins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ventureId,
          notes: notes || null,
          actionItems: actionItems.length > 0 ? actionItems : null,
          nextCheckInDate: nextCheckInDate || null,
          attendees,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create check-in");
      }

      // Redirect to appropriate page (instructor or mentor)
      const targetUrl = redirectUrl || `/instructor/ventures/${ventureId}/check-ins`;
      router.push(targetUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Venture Info Section */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">
          Venture Information
        </h3>
        <p className="text-sm text-gray-900 font-medium">{ventureName}</p>
      </div>

      {/* Notes Section */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          Check-in Notes
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Document observations, highlights, and concerns from this check-in..."
          rows={6}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <p className="mt-2 text-xs text-gray-500">
          Use this space to capture key discussion points and observations.
        </p>
      </div>

      {/* Action Items Section */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex items-center justify-between mb-4">
          <label className="text-sm font-semibold text-gray-700">
            Action Items
          </label>
          <button
            type="button"
            onClick={handleAddActionItem}
            className="inline-flex items-center rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors"
          >
            + Add Item
          </button>
        </div>

        {actionItems.length === 0 ? (
          <p className="text-sm text-gray-500 py-4">
            No action items yet. Click "Add Item" to create one.
          </p>
        ) : (
          <div className="space-y-4">
            {actionItems.map((item, index) => (
              <div
                key={index}
                className="border border-gray-200 rounded-lg p-4 space-y-3"
              >
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Action Item Description
                  </label>
                  <input
                    type="text"
                    value={item.text}
                    onChange={(e) =>
                      handleActionItemChange(index, "text", e.target.value)
                    }
                    placeholder="What needs to be done?"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Assigned To
                    </label>
                    <select
                      value={item.assignee}
                      onChange={(e) =>
                        handleActionItemChange(index, "assignee", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select team member</option>
                      {teamMembers.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.firstName} {member.lastName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Due Date
                    </label>
                    <input
                      type="date"
                      value={item.dueDate}
                      onChange={(e) =>
                        handleActionItemChange(index, "dueDate", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleRemoveActionItem(index)}
                  className="inline-flex items-center text-xs text-red-600 hover:text-red-700"
                >
                  Remove Item
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Attendance Section */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <label className="block text-sm font-semibold text-gray-700 mb-4">
          Attendance
        </label>
        <div className="space-y-3">
          {teamMembers.map((member) => (
            <label
              key={member.id}
              className="flex items-center gap-3 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={attendance[member.id]}
                onChange={() => handleAttendanceChange(member.id)}
                className="w-4 h-4 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-900">
                {member.firstName} {member.lastName}
              </span>
              <span className="text-xs text-gray-500">{member.email}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Next Check-in Date */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          Next Check-in Date
        </label>
        <input
          type="date"
          value={nextCheckInDate}
          onChange={(e) => setNextCheckInDate(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <p className="mt-2 text-xs text-gray-500">
          Schedule the next follow-up meeting with this team.
        </p>
      </div>

      {/* Form Actions */}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? "Creating..." : "Create Check-in"}
        </button>
        <Link
          href={`/instructor/ventures/${ventureId}/check-ins`}
          className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
