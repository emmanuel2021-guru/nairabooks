"use client";

import React from "react";
import { Building2, CheckCircle2, CreditCard, ShieldCheck, Smartphone } from "lucide-react";
import { RevealBlock } from "@/components/landing/SectionMotion";

const BANK_RAILS = [
  { label: "Zenith Bank PDF Sync", icon: Building2 },
  { label: "Moniepoint POS Clearing", icon: Smartphone },
  { label: "GTBank Statement Auto-Match", icon: CheckCircle2 },
  { label: "Paystack Payouts & MDR", icon: CreditCard },
  { label: "Access & UBA Feeds", icon: Building2 },
  { label: "7.5% VAT Safe Pot", icon: ShieldCheck },
  { label: "Nigeria Tax Act 2025 Ready", icon: CheckCircle2 },
] as const;

export function LiveRailsStrip() {
  return (
    <section
      aria-label="Supported Nigerian banks and payment channels"
      className="nb-ticker-wrap overflow-hidden border-b border-[#E5E5EA] bg-[#F8F8FA] py-3.5"
    >
      <RevealBlock yOffset={16}>
        <div className="nb-ticker-track items-center gap-3">
          {[0, 1].map((dupIndex) => (
            <div key={dupIndex} className="flex items-center gap-3 pr-3" aria-hidden={dupIndex === 1}>
              {BANK_RAILS.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={`${dupIndex}-${item.label}`}
                    className="inline-flex items-center gap-2 rounded-full border border-[#E5E5EA] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#1C1C1E] shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
                  >
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-[6px] bg-[#E6F5ED] text-[#006838]">
                      <Icon className="h-3 w-3" strokeWidth={2.2} aria-hidden="true" />
                    </span>
                    <span className="whitespace-nowrap">{item.label}</span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </RevealBlock>
    </section>
  );
}
