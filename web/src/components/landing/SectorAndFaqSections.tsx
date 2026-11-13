"use client";

import React, { useRef } from "react";
import { motion } from "framer-motion";
import { Check, Minus } from "lucide-react";
import {
  AnimatedSection,
  RevealBlock,
  useSafeInView,
  useScrollChoreography,
} from "@/components/landing/SectionMotion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface SectorItem {
  readonly id: string;
  readonly label: string;
  readonly cityExample: string;
  readonly headline: string;
  readonly description: string;
  readonly sampleMetricLabel: string;
  readonly sampleMetricValue: string;
  readonly checklist: readonly string[];
}

const SECTORS: readonly [SectorItem, ...SectorItem[]] = [
  {
    id: "shops",
    label: "Retail Shops",
    cityExample: "Lagos · Ibadan · Port Harcourt",
    headline: "Close your POS and cash drawer in 2 minutes.",
    description:
      "Count card, Moniepoint, and transfer sales together at closing time without missing a single naira.",
    sampleMetricLabel: "Average daily time saved",
    sampleMetricValue: "45 mins / day",
    checklist: [
      "Reconciles Moniepoint, OPay, and Paystack settlements",
      "Alerts you when an item is running low in the store",
      "Keeps your 7.5% VAT calculated automatically",
    ],
  },
  {
    id: "wholesale",
    label: "Wholesale",
    cityExample: "Onitsha · Kano · Idumota",
    headline: "Know which traders owe you money right now.",
    description:
      "Send clear credit invoices, track part payments, and keep big warehouse orders profitable.",
    sampleMetricLabel: "Stock & credit visibility",
    sampleMetricValue: "Real-time",
    checklist: [
      "See unpaid customer balances sorted by days overdue",
      "Track cost of goods sold per carton or container",
      "Record lorry delivery expenses right beside each order",
    ],
  },
  {
    id: "makers",
    label: "Makers",
    cityExample: "Aba · Ogun · Kaduna",
    headline: "Price what you make with confidence.",
    description:
      "Add raw materials, packaging, and diesel or generator fuel into every batch so you never sell at a loss.",
    sampleMetricLabel: "True unit cost clarity",
    sampleMetricValue: "100% tracked",
    checklist: [
      "Combine material costs and factory running expenses",
      "Turn raw stock into finished goods with one click",
      "Compare margin across products before raising prices",
    ],
  },
  {
    id: "contractors",
    label: "Contractors",
    cityExample: "Abuja · Rivers · Enugu",
    headline: "Track project stages and tax deductions.",
    description:
      "Bill clients by milestone, save the 2% or 5% tax they hold back, and see profit per site.",
    sampleMetricLabel: "Project cost tracking",
    sampleMetricValue: "Per milestone",
    checklist: [
      "Keep WHT certificates ready so you do not pay tax twice",
      "Separate site expenses from office overhead",
      "Know which contract is still owed final retention money",
    ],
  },
  {
    id: "agencies",
    label: "Agencies",
    cityExample: "Victoria Island · Yaba · Abuja",
    headline: "Send smart invoices and track retainers.",
    description:
      "Whether you run a studio, clinic, or consulting team, see monthly profit without waiting for year-end.",
    sampleMetricLabel: "Tax rule built in",
    sampleMetricValue: "Tax Act 2025",
    checklist: [
      "Clean branded invoices with bank transfer or Paystack link",
      "Tracks staff payroll and pension contributions cleanly",
      "Invite your external accountant without giving away bank passwords",
    ],
  },
  {
    id: "ngos",
    label: "NGOs",
    cityExample: "Nationwide Grant Teams",
    headline: "Keep each donor fund cleanly separated.",
    description:
      "Never mix money meant for one program with another — print donor-ready reports in minutes.",
    sampleMetricLabel: "Fund separation",
    sampleMetricValue: "Per grant pot",
    checklist: [
      "Tag every expense directly to the right program or donor",
      "Track remaining grant balance before approving new spend",
      "Export clear activity logs that donors trust immediately",
    ],
  },
];

const COMPARISON_ROWS = [
  {
    feature: "Matches Nigerian bank PDFs (Zenith, GTBank, Access, UBA)",
    paper: false,
    foreign: false,
  },
  {
    feature: "Understands Nigeria Tax Act 2025 & 7.5% VAT automatically",
    paper: false,
    foreign: false,
  },
  {
    feature: "Splits Paystack and POS fees without manual math",
    paper: false,
    foreign: false,
  },
  {
    feature: "Simple language for owners + full codes for accountants",
    paper: false,
    foreign: false,
  },
  {
    feature: "Priced cleanly in Naira without USD card headaches",
    paper: true,
    foreign: false,
  },
];

const FAQS = [
  {
    id: "cit",
    question: "Do small businesses pay Company Tax under the 2025 law?",
    answer:
      "Most qualifying small businesses with yearly turnover under ₦100 million pay 0% Company Income Tax under the Nigeria Tax Act 2025. NairaBooks tracks where your turnover sits all year so there are zero surprises.",
  },
  {
    id: "banks",
    question: "How do I bring in my Zenith, GTBank, or Paystack records?",
    answer:
      "You can upload your bank PDF statement or CSV payout file straight into NairaBooks. It matches customer payments, spots POS charges, and shows anything missing in clear words.",
  },
  {
    id: "hybrid",
    question:
      "What if I run two types of businesses together, like a hotel and restaurant?",
    answer:
      "You can add extra business packs inside one workspace whenever you grow. Room bookings and diner bills stay separate in reports while sitting cleanly in the same company books.",
  },
  {
    id: "accountant",
    question: "Will my accountant still trust the numbers?",
    answer:
      "Yes. Behind the simple everyday words, every entry creates proper balanced Debit and Credit books and locks a permanent history of who posted or changed each item.",
  },
];

export function SectorAndFaqSections() {
  const { canAnimate, prefersReduced } = useScrollChoreography();
  const tableRef = useRef<HTMLDivElement | null>(null);
  const faqRef = useRef<HTMLDivElement | null>(null);
  const tableInView = useSafeInView(tableRef, { amount: 0.2 });
  const faqInView = useSafeInView(faqRef, { amount: 0.2 });

  return (
    <>
      {/* 6 Business Types Section (iOS Segmented Tabs + Grouped Inset Cards) */}
      <AnimatedSection
        id="sectors"
        className="scroll-mt-20 border-y border-[#E5E5EA] bg-white py-16"
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <RevealBlock className="max-w-2xl space-y-2">
            <Badge variant="emerald" className="shadow-sm">Built for Real Nigerian Work</Badge>
            <h2 className="text-2xl font-black tracking-[-0.03em] text-[#1C1C1E] sm:text-3xl lg:text-4xl">
              Pick the setup that fits{" "}
              <span className="bg-gradient-to-r from-[#006838] to-[#047857] bg-clip-text text-transparent">
                your exact business
              </span>
              .
            </h2>
            <p className="text-sm leading-relaxed text-[#5E5E64] sm:text-base">
              Start with clean essentials, then switch on extra tools whenever
              your business grows.
            </p>
          </RevealBlock>

          <RevealBlock delay={0.1} yOffset={36}>
            <Tabs defaultValue="shops" className="mt-8">
              <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1">
                {SECTORS.map((sector) => (
                  <TabsTrigger key={sector.id} value={sector.id}>
                    {sector.label}
                  </TabsTrigger>
                ))}
              </TabsList>

              {SECTORS.map((sector) => (
                <TabsContent key={sector.id} value={sector.id} className="mt-4">
                  <motion.div
                    initial={prefersReduced ? false : { y: 12, scale: 0.985 }}
                    animate={{ y: 0, scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  >
                    <Card className="bg-[#F2F2F7]/65">
                      <CardContent className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.35fr_0.85fr] lg:items-center">
                        <div className="space-y-4">
                          <p className="font-mono text-xs font-semibold uppercase tracking-wider text-[#006838]">
                            {sector.cityExample}
                          </p>
                          <h3 className="text-xl font-bold tracking-[-0.02em] text-[#1C1C1E] sm:text-2xl">
                            {sector.headline}
                          </h3>
                          <p className="text-sm leading-relaxed text-[#5E5E64] sm:text-base">
                            {sector.description}
                          </p>
                          <ul className="space-y-2.5 pt-1">
                            {sector.checklist.map((item, idx) => (
                              <motion.li
                                key={item}
                                initial={prefersReduced ? false : { x: -12, y: 4 }}
                                animate={{ x: 0, y: 0 }}
                                transition={{
                                  type: "spring",
                                  stiffness: 320,
                                  damping: 24,
                                  delay: idx * 0.06,
                                }}
                                className="flex items-start gap-2.5 text-sm text-[#1C1C1E]"
                              >
                                <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#E6F5ED] text-[#006838]">
                                  <Check className="h-3.5 w-3.5" strokeWidth={2.4} aria-hidden="true" />
                                </span>
                                <span>{item}</span>
                              </motion.li>
                            ))}
                          </ul>
                        </div>

                        <div className="rounded-[18px] border border-[#E5E5EA] bg-white p-6 shadow-sm">
                          <p className="text-xs font-medium text-[#5E5E64]">
                            {sector.sampleMetricLabel}
                          </p>
                          <p className="mt-2 font-mono text-2xl font-bold tracking-tight text-[#1C1C1E]">
                            {sector.sampleMetricValue}
                          </p>
                          <p className="mt-3 text-sm text-[#5E5E64]">
                            Works right alongside Zenith, GTBank, Moniepoint, and
                            Paystack records in one clean place.
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                </TabsContent>
              ))}
            </Tabs>
          </RevealBlock>
        </div>
      </AnimatedSection>

      {/* Clean Comparison Table Inside iOS Grouped Card */}
      <AnimatedSection className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <RevealBlock className="max-w-2xl space-y-2">
          <Badge variant="outline" className="border-[#006838]/30 font-semibold text-[#006838]">
            Direct Nigerian Advantage
          </Badge>
          <h2 className="text-2xl font-black tracking-[-0.03em] text-[#1C1C1E] sm:text-3xl lg:text-4xl">
            Why Nigerian founders replace{" "}
            <span className="text-[#B91C1C] line-through decoration-2 decoration-red-400">
              Excel
            </span>{" "}
            and foreign apps.
          </h2>
          <p className="text-sm leading-relaxed text-[#5E5E64] sm:text-base">
            Spreadsheets break when you have 50 daily POS transfers, and foreign
            apps charge in dollars without knowing Nigerian tax rules.
          </p>
        </RevealBlock>

        <RevealBlock delay={0.1} yOffset={36}>
          <div ref={tableRef}>
            <Card className="mt-8 overflow-hidden">
              <Table>
                <TableHeader className="bg-[#F2F2F7]/80">
                  <TableRow className="border-[#E5E5EA]">
                    <TableHead className="text-[#1C1C1E]">What matters daily</TableHead>
                    <TableHead className="text-center text-[#5E5E64]">Excel / Notes</TableHead>
                    <TableHead className="text-center text-[#5E5E64]">Foreign Apps</TableHead>
                    <TableHead className="bg-[#E6F5ED]/75 text-center font-semibold text-[#00582E]">
                      NairaBooks
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {COMPARISON_ROWS.map((row, rowIndex) => (
                    <motion.tr
                      key={row.feature}
                      initial={false}
                      animate={
                        canAnimate
                          ? tableInView
                            ? { opacity: 1, x: 0 }
                            : { opacity: 0.15, x: -24 }
                          : { opacity: 1, x: 0 }
                      }
                      transition={{
                        type: "spring",
                        stiffness: 260,
                        damping: 24,
                        delay: canAnimate && tableInView ? rowIndex * 0.07 : 0,
                      }}
                      className="border-b border-[#E5E5EA] transition-colors hover:bg-muted/50"
                    >
                      <TableCell className="font-medium text-[#1C1C1E]">
                        {row.feature}
                      </TableCell>
                      <TableCell className="text-center">
                        {row.paper ? (
                          <Check
                            className="mx-auto h-4 w-4 text-[#5E5E64]"
                            strokeWidth={2.4}
                            aria-label="Included"
                          />
                        ) : (
                          <Minus
                            className="mx-auto h-4 w-4 text-[#C7C7CC]"
                            aria-label="Not included"
                          />
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Minus
                          className="mx-auto h-4 w-4 text-[#C7C7CC]"
                          aria-label="Not included"
                        />
                      </TableCell>
                      <TableCell className="bg-[#E6F5ED]/35 text-center">
                        <motion.span
                          initial={false}
                          animate={
                            canAnimate
                              ? tableInView
                                ? { scale: 1 }
                                : { scale: 0.45 }
                              : { scale: 1 }
                          }
                          transition={{
                            type: "spring",
                            stiffness: 380,
                            damping: 18,
                            delay: canAnimate && tableInView ? rowIndex * 0.07 + 0.08 : 0,
                          }}
                          className="inline-flex"
                        >
                          <Check
                            className="mx-auto h-4 w-4 text-[#006838]"
                            strokeWidth={2.5}
                            aria-label="Included in NairaBooks"
                          />
                        </motion.span>
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>
        </RevealBlock>
      </AnimatedSection>

      {/* Plain-English FAQ Inside iOS Grouped Settings Card */}
      <AnimatedSection id="faq" className="scroll-mt-20 mx-auto max-w-4xl px-4 pb-16 sm:px-6 lg:px-8">
        <RevealBlock yOffset={36}>
          <div ref={faqRef}>
            <Card>
              <CardHeader>
                <CardTitle className="text-xl font-bold tracking-[-0.02em] text-[#1C1C1E]">
                  Common questions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {FAQS.map((item, faqIndex) => (
                    <motion.div
                      key={item.id}
                      initial={false}
                      animate={
                        canAnimate
                          ? faqInView
                            ? { opacity: 1, y: 0 }
                            : { opacity: 0.15, y: 18 }
                          : { opacity: 1, y: 0 }
                      }
                      transition={{
                        type: "spring",
                        stiffness: 260,
                        damping: 24,
                        delay: canAnimate && faqInView ? faqIndex * 0.08 : 0,
                      }}
                    >
                      <AccordionItem value={item.id}>
                        <AccordionTrigger>{item.question}</AccordionTrigger>
                        <AccordionContent className="leading-relaxed text-[#5E5E64]">
                          {item.answer}
                        </AccordionContent>
                      </AccordionItem>
                    </motion.div>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          </div>
        </RevealBlock>
      </AnimatedSection>
    </>
  );
}
