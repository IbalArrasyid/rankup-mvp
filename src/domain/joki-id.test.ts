import { describe, expect, it } from "vitest";
import { generatePublicJokiId, publicJokiIdPattern } from "@/domain/joki-id";

describe("public joki ID", () => {
  it("uses the stable JK-date-random format", () => {
    const id = generatePublicJokiId(new Date(2026, 8, 13));

    expect(id).toMatch(publicJokiIdPattern);
    expect(id).toMatch(/^JK-260913-/);
  });

  it("generates a fresh random suffix", () => {
    expect(generatePublicJokiId(new Date(2026, 8, 13))).not.toBe(generatePublicJokiId(new Date(2026, 8, 13)));
  });
});
