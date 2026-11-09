/** Forgiving riddle matching: ignores case, punctuation, extra spaces and a leading "the"/"a"/"an". */
function normalizeAnswer(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^(the|a|an) /, "");
}

export function answerMatches(input: string, accepted: string[]): boolean {
  const a = normalizeAnswer(input);
  return a !== "" && accepted.some((x) => normalizeAnswer(x) === a);
}
