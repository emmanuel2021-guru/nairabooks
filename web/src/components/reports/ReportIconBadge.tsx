"use client";

import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  Banknote,
  BarChart3,
  BookOpen,
  Boxes,
  Briefcase,
  Clock,
  FileSpreadsheet,
  Landmark,
  Receipt,
  Scale,
  ShieldCheck,
  Users,
} from "lucide-react";

export function ReportGlyph({
  iconKey,
  className = "h-5 w-5",
}: {
  readonly iconKey: string;
  readonly className?: string;
}) {
  switch (iconKey) {
    case "scale":
      return <Scale className={className} aria-hidden="true" />;
    case "receipt":
      return <Receipt className={className} aria-hidden="true" />;
    case "banknote":
      return <Banknote className={className} aria-hidden="true" />;
    case "book-open":
      return <BookOpen className={className} aria-hidden="true" />;
    case "boxes":
      return <Boxes className={className} aria-hidden="true" />;
    case "users":
      return <Users className={className} aria-hidden="true" />;
    case "landmark":
      return <Landmark className={className} aria-hidden="true" />;
    case "briefcase":
      return <Briefcase className={className} aria-hidden="true" />;
    case "clock":
      return <Clock className={className} aria-hidden="true" />;
    case "shield-check":
      return <ShieldCheck className={className} aria-hidden="true" />;
    case "file-spreadsheet":
      return <FileSpreadsheet className={className} aria-hidden="true" />;
    default:
      return <BarChart3 className={className} aria-hidden="true" />;
  }
}

export function ReportIconBadge({
  iconKey,
  tintBg,
  tintText,
  size = "md",
  animateHover = true,
}: {
  readonly iconKey: string;
  readonly tintBg: string;
  readonly tintText: string;
  readonly size?: "sm" | "md" | "lg";
  readonly animateHover?: boolean;
}) {
  const prefersReduced = useReducedMotion();

  const boxSize =
    size === "sm"
      ? "h-8 w-8 rounded-[10px]"
      : size === "lg"
        ? "h-12 w-12 rounded-[15px]"
        : "h-10 w-10 rounded-[13px]";

  const iconSize =
    size === "sm"
      ? "h-4 w-4"
      : size === "lg"
        ? "h-6 w-6"
        : "h-5 w-5";

  return (
    <span
      tabIndex={0}
      aria-hidden="true"
      style={{ backgroundColor: tintBg, color: tintText }}
      className={`inline-flex shrink-0 items-center justify-center border border-black/[0.04] shadow-[0_2px_6px_rgba(28,28,30,0.05)] ${boxSize}`}
    >
      <ReportGlyph iconKey={iconKey} className={iconSize} />
    </span>
  );
}
