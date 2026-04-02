"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface UserMenuProps {
  name: string;
  email: string;
  role: string;
  avatarUrl?: string | null;
}

export function UserMenu({ name, email, role, avatarUrl }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const roleLabel =
    role === "INSTRUCTOR"
      ? "Instructor"
      : role === "STUDENT"
        ? "Student"
        : "Mentor";

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-gray-100 transition-colors w-full"
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={name}
            className="h-8 w-8 rounded-full"
          />
        ) : (
          <div className="h-8 w-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-semibold">
            {initials}
          </div>
        )}
        <div className="text-left flex-1 min-w-0">
          <p className="font-medium text-gray-900 truncate">{name}</p>
          <p className="text-xs text-gray-500">{roleLabel}</p>
        </div>
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute bottom-full left-0 right-0 mb-1 z-50 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
            <div className="px-3 py-2 border-b border-gray-100">
              <p className="text-xs text-gray-500 truncate">{email}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
