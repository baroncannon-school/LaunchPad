"use client";

import { MaterialForm } from "@/components/materials/material-form";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

interface Unit {
  id: string;
  title: string;
  description: string | null;
  isPublished: boolean;
  materials: Material[];
}

interface Material {
  id: string;
  title: string;
  description: string | null;
  type: string;
  url: string | null;
  isPublished: boolean;
}

const MATERIAL_ICONS: Record<string, string> = {
  READING: "📖",
  SLIDE_DECK: "📊",
  VIDEO: "🎬",
  LINK: "🔗",
  FILE: "📁",
  TEMPLATE: "📋",
};

export default function UnitDetailPage({
  params,
}: {
  params: Promise<{ unitId: string }>;
}) {
  const [unitId, setUnitId] = useState<string | null>(null);
  const [unit, setUnit] = useState<Unit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const router = useRouter();

  // Resolve params
  useEffect(() => {
    params.then((p) => setUnitId(p.unitId));
  }, [params]);

  // Fetch unit data
  const fetchUnit = useCallback(async () => {
    if (!unitId) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/units/${unitId}`);
      if (!response.ok) {
        throw new Error("Failed to load unit");
      }

      const data = await response.json();
      setUnit(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [unitId]);

  useEffect(() => {
    fetchUnit();
  }, [fetchUnit]);

  // Handle material delete
  const handleDeleteMaterial = async (materialId: string) => {
    if (!confirm("Are you sure you want to delete this material?")) return;

    try {
      const response = await fetch(`/api/materials/${materialId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete material");
      }

      // Refresh unit
      await fetchUnit();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete material");
    }
  };

  // Handle material publish toggle
  const handleTogglePublish = async (material: Material) => {
    try {
      const response = await fetch(`/api/materials/${material.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished: !material.isPublished }),
      });

      if (!response.ok) {
        throw new Error("Failed to update material");
      }

      // Refresh unit
      await fetchUnit();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update material");
    }
  };

  // Handle unit delete
  const handleDeleteUnit = async () => {
    if (!unit) return;
    if (!confirm(`Are you sure you want to delete "${unit.title}" and all its materials?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/units/${unit.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete unit");
      }

      // Redirect back to materials
      router.push("/instructor/materials");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete unit");
    }
  };

  // Handle unit publish toggle
  const handleToggleUnitPublish = async () => {
    if (!unit) return;

    try {
      const response = await fetch(`/api/units/${unit.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished: !unit.isPublished }),
      });

      if (!response.ok) {
        throw new Error("Failed to update unit");
      }

      // Refresh unit
      await fetchUnit();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update unit");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-500">Loading unit...</p>
      </div>
    );
  }

  if (error || !unit) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <p className="text-red-600">
          {error || "Unit not found"}
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-6 text-sm text-gray-500">
        <a href="/instructor/materials" className="hover:text-gray-700">
          Materials
        </a>
        <span className="mx-2">/</span>
        <span className="text-gray-900 font-medium">{unit.title}</span>
      </div>

      {/* Unit header */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{unit.title}</h1>
            {unit.description && (
              <p className="text-gray-600">{unit.description}</p>
            )}
          </div>
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
              unit.isPublished
                ? "bg-green-100 text-green-800"
                : "bg-yellow-100 text-yellow-800"
            }`}
          >
            {unit.isPublished ? "Published" : "Draft"}
          </span>
        </div>

        <div className="flex gap-2 pt-4 border-t border-gray-100">
          <button
            onClick={handleToggleUnitPublish}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
              unit.isPublished
                ? "bg-yellow-50 text-yellow-700 hover:bg-yellow-100"
                : "bg-green-50 text-green-700 hover:bg-green-100"
            }`}
          >
            {unit.isPublished ? "Unpublish" : "Publish"}
          </button>
          <button
            onClick={handleDeleteUnit}
            className="px-4 py-2 bg-red-50 text-red-600 rounded-lg font-medium text-sm hover:bg-red-100 transition-colors"
          >
            Delete Unit
          </button>
        </div>
      </div>

      {/* Materials section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Materials ({unit.materials.length})
          </h2>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            {showAddForm ? "Cancel" : "+ Add Material"}
          </button>
        </div>

        {showAddForm && (
          <div className="rounded-xl border border-gray-200 bg-white p-6 mb-6">
            <MaterialForm
              unitId={unit.id}
              onSuccess={() => {
                setShowAddForm(false);
                fetchUnit();
              }}
              onCancel={() => setShowAddForm(false)}
            />
          </div>
        )}

        {unit.materials.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-6 text-center">
            <p className="text-gray-500">No materials yet. Add one to get started.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {unit.materials.map((material) => (
              <MaterialRow
                key={material.id}
                material={material}
                onTogglePublish={() => handleTogglePublish(material)}
                onDelete={() => handleDeleteMaterial(material.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MaterialRow({
  material,
  onTogglePublish,
  onDelete,
}: {
  material: Material;
  onTogglePublish: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1 flex items-start gap-3">
          <span className="text-2xl mt-1">
            {MATERIAL_ICONS[material.type] || "📄"}
          </span>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">{material.title}</h3>
            {material.description && (
              <p className="text-sm text-gray-600 mt-1">{material.description}</p>
            )}
            {material.url && (
              <p className="text-xs text-blue-600 mt-1 break-all">
                <span className="text-gray-500">URL: </span>
                {material.url}
              </p>
            )}
            <p className="text-xs text-gray-500 mt-2">
              Type: <span className="font-medium">{material.type.replace(/_/g, " ")}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 ml-4">
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${
              material.isPublished
                ? "bg-green-100 text-green-800"
                : "bg-gray-100 text-gray-800"
            }`}
          >
            {material.isPublished ? "Published" : "Draft"}
          </span>
          <button
            onClick={onTogglePublish}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              material.isPublished
                ? "bg-yellow-50 text-yellow-700 hover:bg-yellow-100"
                : "bg-green-50 text-green-700 hover:bg-green-100"
            }`}
          >
            {material.isPublished ? "Unpublish" : "Publish"}
          </button>
          <button
            onClick={onDelete}
            className="px-3 py-1 bg-red-50 text-red-600 rounded text-xs font-medium hover:bg-red-100 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
