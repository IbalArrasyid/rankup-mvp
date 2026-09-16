import { describe, expect, it } from "vitest";
import { generatePublicJobId, publicJobIdPattern } from "@/domain/job-id";

describe("public job ID", () => {
  it("uses the stable non-sequential JOB-date-random format", () => {
    const id = generatePublicJobId(new Date(2026, 8, 14));
    expect(id).toMatch(publicJobIdPattern);
    expect(id).toMatch(/^JOB-260914-/);
  });

  it("generates a fresh random suffix", () => {
    expect(generatePublicJobId()).not.toBe(generatePublicJobId());
  });
});
