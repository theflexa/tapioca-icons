const BLOCKED_TERMS = [
  "nude", "naked", "nsfw", "porn", "sex", "hentai",
  "gore", "blood", "murder", "kill", "torture", "violence",
  "drug", "cocaine", "heroin",
  "weapon", "gun", "bomb",
];

const INJECTION_PATTERNS = [
  /ignore\s+(previous|all|above)\s+instructions/i,
  /disregard\s+(previous|all|above)/i,
  /you\s+are\s+now/i,
  /new\s+instructions/i,
  /system\s*prompt/i,
];

type FilterResult =
  | { ok: true; sanitized: string }
  | { ok: false; reason: string };

export function filterPrompt(raw: string): FilterResult {
  const trimmed = raw.trim();

  if (trimmed.length === 0) {
    return { ok: false, reason: "Prompt cannot be empty" };
  }

  if (trimmed.length > 200) {
    return { ok: false, reason: "Prompt must be 200 characters or less" };
  }

  const lower = trimmed.toLowerCase();

  for (const term of BLOCKED_TERMS) {
    if (new RegExp("\\b" + term + "\\b", "i").test(lower)) {
      return { ok: false, reason: "Prompt contains prohibited content" };
    }
  }

  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { ok: false, reason: "Prompt contains prohibited content" };
    }
  }

  return { ok: true, sanitized: trimmed };
}
