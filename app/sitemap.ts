import type { MetadataRoute } from "next";

/**
 * Resolve the canonical site origin.
 * Prefers an explicit NEXT_PUBLIC_SITE_URL, then the Vercel production URL,
 * and finally falls back to localhost for local dev.
 */
function getBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel}`;

  return "http://localhost:3000";
}

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getBaseUrl();
  const lastModified = new Date();

  const routes: Array<{
    path: string;
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
    priority: number;
  }> = [
    { path: "/", changeFrequency: "hourly", priority: 1 },
    { path: "/shop", changeFrequency: "daily", priority: 0.8 },
    { path: "/redeem", changeFrequency: "weekly", priority: 0.5 },
  ];

  return routes.map(({ path, changeFrequency, priority }) => ({
    url: `${baseUrl}${path}`,
    lastModified,
    changeFrequency,
    priority,
  }));
}
