"use client";

import React from "react";
import { Moon, Sun } from "lucide-react";
import { useThemeMode } from "@/state/theme-mode";

export function ThemeToggle({
  className = "",
  size = "md",
}: {
  readonly className?: string;
  readonly size?: "sm" | "md";
}) {
  const { theme, toggleTheme } = useThemeMode();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-pressed={isDark}
      className={`inline-flex items-center justify-center rounded-full border border-borderSubtle bg-surface text-ink transition-colors hover:bg-surfaceAlt focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
        size === "sm"
          ? "min-h-[36px] min-w-[36px] p-2"
          : "min-h-[38px] min-w-[38px] sm:min-h-[44px] sm:min-w-[44px] p-2"
      } ${className}`}
    >
      {isDark ? (
        <Sun className="h-4 w-4 text-amber-400 transition-transform duration-200 rotate-0 hover:rotate-45" aria-hidden="true" />
      ) : (
        <Moon className="h-4 w-4 text-slate-700 transition-transform duration-200 rotate-0 hover:-rotate-12" aria-hidden="true" />
      )}
    </button>
  );
}
