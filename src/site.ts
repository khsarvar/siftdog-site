// Site-wide constants.

export const SITE_NAME = "Siftdog";
export const GITHUB_URL = "https://github.com/khsarvar/siftdog";
export const AUTHOR = { "@type": "Person", name: "Sarvar", url: "https://github.com/khsarvar" };

// Waitlist storage (Supabase). The publishable key is meant to be public: the table only allows
// anonymous inserts (row level security), never reads.
export const SUPABASE_URL = import.meta.env.PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_PUBLISHABLE_KEY = import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

export function formatDate(date: Date): string {
  // Front-matter dates are midnight UTC; format in UTC so the day doesn't shift by time zone.
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}
