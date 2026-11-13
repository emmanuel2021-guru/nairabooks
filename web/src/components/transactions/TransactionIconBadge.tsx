"use client";

import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  Ban,
  Banknote,
  BellRing,
  BookOpen,
  Boxes,
  ClipboardCheck,
  FileClock,
  FileMinus,
  FileText,
  Landmark,
  Layers,
  ListChecks,
  Mail,
  PackageCheck,
  PenTool,
  Percent,
  PiggyBank,
  Receipt,
  RotateCcw,
  Scale,
  Send,
  ShoppingCart,
  SlidersHorizontal,
  Timer,
  Undo2,
  UserCheck,
  Wallet,
} from "lucide-react";
import type { TransactionIconKey } from "@/components/transactions/transactions-data";

export function TransactionGlyph({
  iconKey,
  className = "h-4 w-4",
}: {
  readonly iconKey: TransactionIconKey;
  readonly className?: string;
}) {
  switch (iconKey) {
    case "file-text":
      return <FileText className={className} aria-hidden="true" />;
    case "receipt":
      return <Receipt className={className} aria-hidden="true" />;
    case "clock-receipt":
      return <FileClock className={className} aria-hidden="true" />;
    case "wallet-in":
      return <Wallet className={className} aria-hidden="true" />;
    case "percent":
      return <Percent className={className} aria-hidden="true" />;
    case "piggy-bank":
      return <PiggyBank className={className} aria-hidden="true" />;
    case "rotate-ccw":
      return <RotateCcw className={className} aria-hidden="true" />;
    case "clipboard-check":
      return <ClipboardCheck className={className} aria-hidden="true" />;
    case "shopping-cart":
      return <ShoppingCart className={className} aria-hidden="true" />;
    case "package-check":
      return <PackageCheck className={className} aria-hidden="true" />;
    case "file-minus":
      return <FileMinus className={className} aria-hidden="true" />;
    case "list-checks":
      return <ListChecks className={className} aria-hidden="true" />;
    case "send":
      return <Send className={className} aria-hidden="true" />;
    case "pen-tool":
      return <PenTool className={className} aria-hidden="true" />;
    case "undo":
      return <Undo2 className={className} aria-hidden="true" />;
    case "book-open":
      return <BookOpen className={className} aria-hidden="true" />;
    case "landmark":
      return <Landmark className={className} aria-hidden="true" />;
    case "ban":
      return <Ban className={className} aria-hidden="true" />;
    case "timer":
      return <Timer className={className} aria-hidden="true" />;
    case "users-check":
      return <UserCheck className={className} aria-hidden="true" />;
    case "banknote":
      return <Banknote className={className} aria-hidden="true" />;
    case "scale":
      return <Scale className={className} aria-hidden="true" />;
    case "boxes":
      return <Boxes className={className} aria-hidden="true" />;
    case "layers":
      return <Layers className={className} aria-hidden="true" />;
    case "mail":
      return <Mail className={className} aria-hidden="true" />;
    case "bell-ring":
      return <BellRing className={className} aria-hidden="true" />;
    case "sliders":
      return <SlidersHorizontal className={className} aria-hidden="true" />;
  }
}

export function TransactionIconBadge({
  iconKey,
  tintBg,
  tintText,
  size = "md",
  animateHover = true,
}: {
  readonly iconKey: TransactionIconKey;
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
        : "h-10 w-10 rounded-[12px]";

  const iconSize =
    size === "sm" ? "h-4 w-4" : size === "lg" ? "h-5.5 w-5.5" : "h-[18px] w-[18px]";

  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center border border-black/[0.04] shadow-[0_2px_6px_rgba(28,28,30,0.05)] ${boxSize} ${tintBg} ${tintText}`}
    >
      <TransactionGlyph iconKey={iconKey} className={iconSize} />
    </span>
  );
}
