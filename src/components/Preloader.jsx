"use client";

import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

export default function Preloader() {
  const pathname = usePathname();
  const [done, setDone] = useState(false);

  // Skip preloader entirely on admin pages
  const isAdmin = pathname?.startsWith("/admin");

  useEffect(() => {
    if (isAdmin) {
      setDone(true);
      return;
    }

    let seen = false;
    try {
      seen = sessionStorage.getItem("vimuhet_intro") === "1";
    } catch {
      seen = true; // if sessionStorage blocked, skip intro
    }

    const timer = setTimeout(() => {
      setDone(true);
      try {
        sessionStorage.setItem("vimuhet_intro", "1");
      } catch {
        /* ignore */
      }
    }, seen ? 100 : 1600);

    // Safety: force-dismiss after 3 seconds no matter what
    const safety = setTimeout(() => setDone(true), 3000);

    return () => {
      clearTimeout(timer);
      clearTimeout(safety);
    };
  }, [isAdmin]);

  // Don't render at all on admin
  if (isAdmin) return null;

  return (
    <AnimatePresence>
      {!done && (
        <motion.div
          className="fixed inset-0 z-[999] flex flex-col items-center justify-center bg-ink"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, filter: "blur(14px)" }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          <motion.div
            className="absolute h-[38rem] w-[38rem] rounded-full opacity-40 animate-blob"
            style={{ background: "radial-gradient(circle,#ff5d8f 0%,transparent 65%)" }}
          />
          <div className="relative flex overflow-hidden">
            {"VIMUHET".split("").map((letter, i) => (
              <motion.span
                key={`${letter}-${i}`}
                initial={{ y: "110%", opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.12 + i * 0.07, duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
                className="font-display text-[13vw] leading-none tracking-[0.06em] sm:text-7xl md:text-8xl"
              >
                {letter}
              </motion.span>
            ))}
          </div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.85 }}
            className="mt-5 text-[0.62rem] uppercase tracking-[0.55em] text-cream/45"
          >
            wear the good life
          </motion.p>
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.3, duration: 1.2, ease: "easeInOut" }}
            className="mt-8 h-[2px] w-48 origin-left"
            style={{ background: "var(--grad)" }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
