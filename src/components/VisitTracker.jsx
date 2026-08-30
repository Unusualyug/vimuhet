"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { deviceType, sessionId } from "@/lib/client-utils";

export default function VisitTracker() {
  const pathname = usePathname();
  const lastSent = useRef("");

  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin")) return;
    if (lastSent.current === pathname) return;
    lastSent.current = pathname;

    fetch("/api/track/visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: sessionId(),
        path: pathname,
        device: deviceType(),
        referrer: typeof document !== "undefined" ? document.referrer : "",
      }),
    }).catch(() => {});
  }, [pathname]);

  return null;
}
