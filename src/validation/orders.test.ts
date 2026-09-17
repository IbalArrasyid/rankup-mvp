import { describe, expect, it } from "vitest";
import { orderCreationSchema, rankSelectionSchema } from "@/validation/orders";

const validOrder = {
  serviceMode: "ACCOUNT",
  customerName: "Raka",
  whatsapp: "081234567890",
  email: "",
  customerNotes: "",
  currentRank: "MYTHICAL_HONOR",
  currentStar: 32,
  targetRank: "MYTHICAL_GLORY",
  targetStar: 55,
} as const;

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

describe("order service-mode validation", () => {
  it("accepts an ACCOUNT order without Gendong coordination data", () => {
    expect(orderCreationSchema.safeParse(validOrder).success).toBe(true);
  });

  it("accepts a GENDONG order with nickname, User ID, and Server ID", () => {
    expect(orderCreationSchema.safeParse({
      ...validOrder,
      serviceMode: "GENDONG",
      mlbbNickname: "RankUp Player",
      mlbbUserId: "123456789",
      mlbbServerId: "1234",
    }).success).toBe(true);
  });

  it.each(["mlbbNickname", "mlbbUserId", "mlbbServerId"] as const)(
    "rejects a GENDONG order without %s",
    (field) => {
      const input = {
        ...validOrder,
        serviceMode: "GENDONG",
        mlbbNickname: "RankUp Player",
        mlbbUserId: "123456789",
        mlbbServerId: "1234",
        [field]: "",
      };
      expect(orderCreationSchema.safeParse(input).success).toBe(false);
    },
  );

  it("rejects an unsupported service mode", () => {
    expect(orderCreationSchema.safeParse({ ...validOrder, serviceMode: "BOOSTING" }).success).toBe(false);
  });
});
