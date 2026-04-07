"use client";

import { useState } from "react";
import Link from "next/link";

interface Unit {
  id: string;
  title: string;
  description: string | null;
  sequenceOrder: number;
}

interface Material {
  id: string;
  unitId: string;
  title: string;
  description: string | null;
  type:
    | "READING"
    | "SLIDE_DECK"
    | "VIDEO"
    | "LINK"
    | "FILE"
    | "TEMPLATE";
  url: string | null;
  filePath: string | null;
  sequenceOrder: number;
}

interface MaterialsByUnit {
  unit: Unit;
  materials: Material[];
}

interface SemesterData {
  semesterId: string;
  semester: "FALL" | "SPRING";
  materialsByUnit: MaterialsByUnit[];
}

interface MaterialsViewerProps {
  semesters: Array<{
    id: string;
    semester: "FALL" | "SPRING";
  }>;
  semesterMaterials: SemesterData[];
  defaultSemesterId: string;
}

export function MaterialsViewer({
  semesters,
  semesterMaterials,
  defaultSemesterId,
}: MaterialsViewerProps) {
  const [selectedSemesterId, setSelectedSemesterId] = useState(defaultSemesterId);

  const currentSemesterData = semesterMaterials.find((s) => s.semesterId === selectedSemesterId);

  const getMaterialIcon = (type: Material["type"]): string => {
    switch (type) {
      case "READING":
        return "📖";
      case "SLIDE_DECK":
        return "📊";
      case "VIDEO":
        return "🎬";
      case "LINK":
        return "🔗";
      case "FILE":
        return "📁";
      case "TEMPLATE":
        return "📋";
      default:
        return "📄";
    }
  };

  const getMaterialTypeLabel = (type: Material["type"]): string => {
    switch (type) {
      case "READING":
        return "Reading";
      case "SLIDE_DECK":
        return "Slide Deck";
      case "VIDEO":
        return "Video";
      case "LINK":
        return "Link";
      case "FILE":
        return "File";
      case "TEMPLATE":
        return "Template";
      default:
        return "Material";
    }
  };

  const totalMaterials = currentSemesterData?.materialsByUnit.reduce(
    (sum, um) => sum + um.materials.length,
    0
  ) || 0;

  return (
    <div className="space-y-6">
      {/* Semester Toggle Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {semesters.map((sem) => (
          <button
            key={sem.id}
            onClick={() => setSelectedSemesterId(sem.id)}
            className={`px-4 py-2 font-medium transition-colors ${
              selectedSemesterId === sem.id
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {sem.semester === "FALL" ? "Fall" : "Spring"}
          </button>
        ))}
      </div>

      {!currentSemesterData || totalMaterials === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-center">
          <p className="text-gray-600">
            No materials available yet for the{" "}
            {currentSemesterData?.semester === "FALL" ? "Fall" : "Spring"} semester.
          </p>
        </div>
      ) : (
        <>
          {/* Info Card */}
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-sm text-gray-700">
              <span className="font-medium">{totalMaterials} material(s)</span> available
              in {totalMaterials === 1 ? "1 unit" : `${currentSemesterData?.materialsByUnit.length} units`}
            </p>
          </div>

          {/* Materials by Unit */}
          <div className="space-y-6">
            {currentSemesterData?.materialsByUnit.map((unitData) => (
              <details
                key={unitData.unit.id}
                className="rounded-xl border border-gray-200 bg-white overflow-hidden group"
                open={true}
              >
                {/* Unit Header (Summary) */}
                <summary className="cursor-pointer px-6 py-4 bg-gray-50 border-b border-gray-200 hover:bg-gray-100 transition-colors flex justify-between items-center">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {unitData.unit.title}
                    </h3>
                    {unitData.unit.description && (
                      <p className="text-sm text-gray-600 mt-1">
                        {unitData.unit.description}
                      </p>
                    )}
                  </div>
                  <div className="text-sm font-medium text-gray-600 ml-4">
                    {unitData.materials.length}{" "}
                    {unitData.materials.length === 1 ? "item" : "items"}
                  </div>
                </summary>

                {/* Unit Materials */}
                <div className="divide-y divide-gray-100">
                  {unitData.materials.map((material) => (
                    <MaterialItem key={material.id} material={material} icon={getMaterialIcon(material.type)} typeLabel={getMaterialTypeLabel(material.type)} />
                  ))}
                </div>
              </details>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

interface MaterialItemProps {
  material: Material;
  icon: string;
  typeLabel: string;
}

function MaterialItem({ material, icon, typeLabel }: MaterialItemProps) {
  const isExternal = material.url?.startsWith("http");

  return (
    <div className="px-6 py-4 hover:bg-gray-50 transition-colors">
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="text-2xl pt-1 flex-shrink-0">{icon}</div>

        {/* Content */}
        <div className="flex-1">
          {/* Title - with link if URL exists */}
          {material.url ? (
            <a
              href={material.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-lg font-semibold text-blue-600 hover:text-blue-700 underline"
            >
              {material.title}
              {isExternal && <span className="ml-1 text-sm">↗</span>}
            </a>
          ) : (
            <h4 className="text-lg font-semibold text-gray-900">
              {material.title}
            </h4>
          )}

          {/* Description */}
          {material.description && (
            <p className="text-sm text-gray-600 mt-1">
              {material.description}
            </p>
          )}

          {/* Type Badge */}
          <div className="mt-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
              {typeLabel}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
