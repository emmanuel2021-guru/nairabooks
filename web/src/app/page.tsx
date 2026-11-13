import React from "react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { LandingPageClient } from "@/components/LandingPageClient";
import {
  getOptionalSessionFromToken,
  SESSION_COOKIE_NAME,
} from "@/lib/auth-bff";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "NairaBooks | Simple Nigerian Bookkeeping & Tax Act 2025 Software",
  description:
    "Track daily POS sales, bank alerts, supplier bills, and 7.5% VAT in plain English — with proper Nigerian accounting ready for your accountant.",
  keywords: [
    "Nigerian bookkeeping software",
    "Nigeria Tax Act 2025",
    "small business accounting Nigeria",
    "Paystack POS reconciliation",
    "Zenith GTBank statement bookkeeping",
    "Lagos business accounting app",
  ],
};

const FAQ_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Do small businesses pay Company Tax under the 2025 law?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Most qualifying small businesses with yearly turnover under ₦100 million pay 0% Company Income Tax under the Nigeria Tax Act 2025. NairaBooks tracks your turnover all year so there are zero surprises.",
      },
    },
    {
      "@type": "Question",
      name: "How do I bring in my Zenith, GTBank, or Paystack records?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "You can upload your bank PDF statement or CSV payout file straight into NairaBooks. It matches customer payments, spots POS charges, and shows anything missing in clear words.",
      },
    },
    {
      "@type": "Question",
      name: "What if I run two types of businesses together, like a hotel and restaurant?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "You can add extra business packs inside one workspace whenever you grow. Room bookings and diner bills stay separate in reports while sitting cleanly in the same company books.",
      },
    },
    {
      "@type": "Question",
      name: "Will my accountant still trust the numbers?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Behind the simple everyday words, every entry creates proper balanced Debit and Credit books and locks a permanent history of who posted or changed each item.",
      },
    },
  ],
};

export default async function PublicLandingPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const activeSession = getOptionalSessionFromToken(token);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ /* safe-json-ld */
          __html: JSON.stringify(FAQ_JSON_LD).replace(/</g, "\\u003c"),
        }}
      />
      <LandingPageClient activeSession={activeSession} />
    </>
  );
}
