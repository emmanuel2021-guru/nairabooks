"use client";

import { motion } from "framer-motion";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CreditCard,
  Landmark,
  Receipt,
  Sparkles,
  Smartphone,
} from "lucide-react";
import type { TransactionCategory } from "./reconcile-data";

interface BadgeConfig {
  readonly icon: React.ComponentType<{ className?: string }>;
  readonly bg: string;
  readonly text: string;
  readonly label: string;
}

const BADGE_CONFIGS: Record<TransactionCategory, BadgeConfig> = {
  TRANSFER_IN: {
    icon: ArrowDownLeft,
    bg: "bg-emerald-50 border-emerald-200",
    text: "text-[#006838]",
    label: "Transfer In / Deposit",
  },
  TRANSFER_OUT: {
    icon: ArrowUpRight,
    bg: "bg-blue-50 border-blue-200",
    text: "text-blue-700",
    label: "Transfer Out / Payment",
  },
  BANK_FEE: {
    icon: Smartphone,
    bg: "bg-amber-50 border-amber-200",
    text: "text-amber-800",
    label: "SMS & Bank Fee",
  },
  INTEREST: {
    icon: Sparkles,
    bg: "bg-teal-50 border-teal-200",
    text: "text-teal-700",
    label: "Credit Interest",
  },
  TAX_WHT: {
    icon: Landmark,
    bg: "bg-purple-50 border-purple-200",
    text: "text-purple-700",
    label: "Withholding Tax (WHT)",
  },
  POS_PAYMENT: {
    icon: Receipt,
    bg: "bg-indigo-50 border-indigo-200",
    text: "text-indigo-700",
    label: "POS / Web Payment",
  },
  CARD_FEE: {
    icon: CreditCard,
    bg: "bg-rose-50 border-rose-200",
    text: "text-rose-700",
    label: "Card Maintenance",
  },
};

export function ReconcileIconBadge({
  category,
  size = "md",
}: {
  readonly category: TransactionCategory;
  readonly size?: "sm" | "md" | "lg";
}) {
  const cfg = BADGE_CONFIGS[category] ?? BADGE_CONFIGS.TRANSFER_IN;
  const IconComponent = cfg.icon;

  const sizeClasses =
    size === "sm"
      ? "h-8 w-8 rounded-lg"
      : size === "lg"
        ? "h-12 w-12 rounded-2xl"
        : "h-10 w-10 rounded-xl";

  const iconSizes = size === "sm" ? "h-4 w-4" : size === "lg" ? "h-6 w-6" : "h-5 w-5";

  return (
    <div
      role="img"
      title={cfg.label}
      aria-label={cfg.label}
      className={`inline-flex items-center justify-center border ${cfg.bg} ${cfg.text} ${sizeClasses} shadow-sm shrink-0`}
    >
      <IconComponent className={iconSizes} aria-hidden="true" />
    </div>
  );
}
