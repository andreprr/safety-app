/**
 * Utility functions for parsing and formatting inspection photo URLs.
 * Handles single URL strings, JSON array strings, and comma-separated URLs.
 */

export const parseFotoUrls = (fotoUrl: string | null | undefined): string[] => {
  if (!fotoUrl || typeof fotoUrl !== "string") return [];
  const trimmed = fotoUrl.trim();
  if (!trimmed) return [];

  // Check if it's a JSON array string: e.g. ["url1", "url2"]
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.filter((url): url is string => typeof url === "string" && url.trim().length > 0);
      }
    } catch {
      // ignore JSON parse error and fallback
    }
  }

  // Check if comma-separated
  if (trimmed.includes(",")) {
    return trimmed.split(",").map((s) => s.trim()).filter((s) => s.length > 0);
  }

  return [trimmed];
};

export const formatFotoUrlsForStorage = (urls: string[]): string => {
  const filtered = urls.filter((u) => typeof u === "string" && u.trim().length > 0);
  if (filtered.length === 0) return "";
  if (filtered.length === 1) return filtered[0];
  return JSON.stringify(filtered);
};
