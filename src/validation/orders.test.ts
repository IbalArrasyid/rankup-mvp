import { describe, expect, it } from "vitest";
import { rankSelectionSchema } from "@/validation/orders";

describe("rank selection validation", () => {
  it("accepts a valid absolute-star selection", () => {
    expect(rankSelectionSchema.safeParse({ currentRank: "MYTHICAL_HONOR", currentStar: 32, targetRank: "MYTHICAL_GLORY", targetStar: 55 }).success).toBe(true);
  });

  it.each([
    [{ currentRank: "MYTHIC", currentStar: 40, targetRank: "MYTHICAL_GLORY", targetStar: 55 }],
    [{ currentRank: "MYTHICAL_HONOR", currentStar: 15, targetRank: "MYTHICAL_GLORY", targetStar: 55 }],
    [{ currentRank: "MYTHICAL_GLORY", currentStar: 57, targetRank: "MYTHICAL_GLORY", targetStar: 120 }],
    [{ currentRank: "MYTHICAL_HONOR", currentStar: 32, targetRank: "MYTHICAL_HONOR", targetStar: 32 }],
  ])("rejects an invalid selection", (selection) => {
    expect(rankSelectionSchema.safeParse(selection).success).toBe(false);
  });
});
