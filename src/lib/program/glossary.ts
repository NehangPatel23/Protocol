export type GlossaryTerm = "1rm" | "rpe" | "rir" | "amrap";

export const GLOSSARY_STORAGE_PREFIX = "protocol:glossary:";

export function glossaryStorageKey(term: GlossaryTerm): string {
  return `${GLOSSARY_STORAGE_PREFIX}${term}`;
}

export function termsInText(blob: string): GlossaryTerm[] {
  const lower = blob.toLowerCase();
  const found: GlossaryTerm[] = [];
  if (/\b1\s*rm\b|\bone[- ]rep max\b/.test(lower)) found.push("1rm");
  if (/\brpe\b/.test(lower)) found.push("rpe");
  if (/\brir\b/.test(lower)) found.push("rir");
  if (/\bamrap\b/.test(lower)) found.push("amrap");
  return found;
}

/** Cues / mistakes / notes blob — same join Exercise Detail uses. */
export function glossaryTermsFromCopy(
  cues: string[],
  mistakes: string[],
  notes: string[] = [],
): GlossaryTerm[] {
  return termsInText([...cues, ...mistakes, ...notes].join(" "));
}

export function shouldAutoOpenGlossary(
  term: GlossaryTerm,
  getItem: (key: string) => string | null,
): boolean {
  return getItem(glossaryStorageKey(term)) !== "1";
}
