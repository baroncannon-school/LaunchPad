"use client";

import { useState } from "react";

interface MaterialFormProps {
  unitId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const MATERIAL_TYPES = [
  { value: "READING", label: "📖 Reading" },
  { value: "SLIDE_DECK", label: "📊 Slide Deck" },
  { value: "VIDEO", label: "🎬 Video" },
  { value: "LINK", label: "🔗 Link" },
  { value: "FILE", label: "📁 File" },
  { value: "TEMPLATE", label: "📋 Template" },
];

export function MaterialForm({ unitId, onSuccess, onCancel }: MaterialFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("READING");
  const [url, setUrl] = useState("");
  const [isPublished, setIsPublished] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/materials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unitId,
          title: title.trim(),
          description: description.trim() || null,
          type,
          url: url.trim() || null,
          isPublished,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create material");
      }

      // Reset form
      setTitle("");
      setDescription("");
      setType("READING");
      setUrl("");
      setIsPublished(false);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="material-title" className="block text-sm font-medium text-gray-700 mb-1">
          Material Title *
        </label>
        <input
          id="material-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., Introduction to Market Research"
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label htmlFor="material-description" className="block text-sm font-medium text-gray-700 mb-1">
          Description
        </label>
        <textarea
          id="material-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Brief description of the material (optional)"
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label htmlFor="material-type" className="block text-sm font-medium text-gray-700 mb-1">
          Material Type *
        </label>
        <select
          id="material-type"
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {MATERIAL_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="material-url" className="block text-sm font-medium text-gray-700 mb-1">
          URL or File Path
        </label>
        <input
          id="material-url"
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com or /storage/path"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="flex items-center">
        <input
          id="material-published"
          type="checkbox"
          checked={isPublished}
          onChange={(e) => setIsPublished(e.target.checked)}
          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
        <label htmlFor="material-published" className="ml-2 text-sm text-gray-700">
          Publish immediately
        </label>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {loading ? "Creating..." : "Add Material"}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
