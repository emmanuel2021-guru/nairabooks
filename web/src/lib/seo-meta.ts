import type { Metadata } from "next";

export interface SeoMetadataOptions {
  title: string;
  description: string;
  path?: string;
  ogType?: "website" | "article";
  publishedTime?: string;
  keywords?: readonly string[];
}

const DEFAULT_BASE_URL = "https://nairabooks.ng";

export function generateSeoMetadata(options: SeoMetadataOptions): Metadata {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || DEFAULT_BASE_URL;
  const canonicalUrl = options.path ? `${baseUrl}${options.path.startsWith("/") ? "" : "/"}${options.path}` : baseUrl;

  const defaultKeywords = [
    "accounting software Nigeria",
    "Nigeria Tax Act 2025",
    "7.5% VAT calculation",
    "Withholding Tax WHT Nigeria",
    "bank reconciliation Access Zenith GTBank",
    "CAMA 2020 compliance",
    "Naira accounting",
  ];

  return {
    title: options.title,
    description: options.description,
    keywords: options.keywords ? [...options.keywords, ...defaultKeywords] : defaultKeywords,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: options.title,
      description: options.description,
      url: canonicalUrl,
      siteName: "NairaBooks",
      locale: "en_NG",
      type: options.ogType || "website",
      ...(options.publishedTime ? { publishedTime: options.publishedTime } : {}),
      images: [
        {
          url: `${baseUrl}/images/nairabooks-og-card.png`,
          width: 1200,
          height: 630,
          alt: "NairaBooks — Zero-Jargon Nigerian Accounting & Tax Platform",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: options.title,
      description: options.description,
      site: "@nairabooks",
      creator: "@nairabooks",
      images: [`${baseUrl}/images/nairabooks-og-card.png`],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
  };
}

export function generateSoftwareSchemaJson(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "NairaBooks",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web, Cloud, Modern Browsers",
    offers: {
      "@type": "Offer",
      price: "0.00",
      priceCurrency: "NGN",
    },
    description:
      "Zero-jargon accounting and tax compliance platform built for the Nigeria Tax Act 2025, CAMA 2020, and Nigerian SME operations.",
  };
}

export function generateFaqSchemaJson(faqs: readonly { question: string; answer: string }[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}
