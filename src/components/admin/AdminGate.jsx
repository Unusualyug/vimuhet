"use client";

import { useEffect, useState } from "react";
import { adminFetch, clearAdminToken, getAdminToken } from "@/lib/admin-client";

/**
 * Client-side guard. Checks the bearer token in localStorage.
 * If invalid or missing → hard redirect to /admin/login.
 */
export default function AdminGate({ children }) {
  const [status, setStatus] = useState("checking"); // checking | ok | denied

  useEffect(() => {
    let alive = true;

    const token = getAdminToken();
    if (!token) {
      // No token at all → go to login immediately
      window.location.href = "/admin/login";
      return;
    }

    // Verify the token
    (async () => {
      try {
        const res = await adminFetch("/api/admin/verify");
        if (!alive) return;
        if (res.ok) {
          setStatus("ok");
        } else {
          clearAdminToken();
          window.location.href = "/admin/login";
        }
      } catch {
        if (!alive) return;
        clearAdminToken();
        window.location.href = "/admin/login";
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  if (status !== "ok") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink">
        <div className="flex flex-col items-center gap-4">
          <span
            className="h-10 w-10 animate-spin rounded-full border-2 border-white/10"
            style={{ borderTopColor: "#e9b26a" }}
          />
          <p className="text-[0.62rem] uppercase tracking-[0.3em] text-cream/40">
            Checking session…
          </p>
        </div>
      </div>
    );
  }

  return children;
}
