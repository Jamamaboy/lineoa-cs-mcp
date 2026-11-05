import { describe, expect, it } from "vitest";
import { chooseOa } from "../../src/client/choose-oa.js";

const bots = [
  { botId: "U1", name: "Demo Shop", searchId: "@demo-shop" },
  { botId: "U2", name: "Test Shop", searchId: "@test-shop" },
];

describe("chooseOa", () => {
  it("asks which OA when there are several and none was named", () => {
    expect(() => chooseOa(bots)).toThrow(/CHOOSE_OA|2 OAs: "Demo Shop" \(@demo-shop\), "Test Shop"/);
  });
  it("uses the only OA, or the configured default", () => {
    expect(chooseOa([bots[0]!]).botId).toBe("U1");
    expect(chooseOa(bots, undefined, "Test Shop").botId).toBe("U2");
  });
  it("matches by name, @id, botId or a unique part of the name", () => {
    expect(chooseOa(bots, "demo shop").botId).toBe("U1");
    expect(chooseOa(bots, "@test-shop").botId).toBe("U2");
    expect(chooseOa(bots, "test-shop").botId).toBe("U2");
    expect(chooseOa(bots, "U2").botId).toBe("U2");
    expect(chooseOa(bots, "Demo").botId).toBe("U1");
  });
  it("refuses an ambiguous or unknown name and lists the choices", () => {
    expect(() => chooseOa(bots, "Shop")).toThrow(/More than one OA matches "Shop"/);
    expect(() => chooseOa(bots, "Nope")).toThrow(/No OA matches "Nope"/);
  });
});
