import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://nairabooks.ng";

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/transactions", "/reconcile", "/reports", "/security", "/guides/"],
        disallow: ["/api/", "/transactions/*/edit", "/_next/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
