"use client";

import { UnitForm } from "@/components/materials/unit-form";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function NewUnitContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const semesterConfigId = searchParams.get("semesterConfigId");

  if (!semesterConfigId) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <p className="text-red-600">Semester configuration ID is required.</p>
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
        <span className="text-gray-900 font-medium">New Unit</span>
      </div>

      {/* Add Unit form */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 max-w-2xl">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Create New Unit</h1>
        <UnitForm
          semesterConfigId={semesterConfigId}
          onSuccess={() => {
            router.push("/instructor/materials");
          }}
          onCancel={() => {
            router.push("/instructor/materials");
          }}
        />
      </div>
    </div>
  );
}

export default function NewUnitPage() {
  return (
    <Suspense fallback={<div className="text-center py-8">Loading...</div>}>
      <NewUnitContent />
    </Suspense>
  );
}
