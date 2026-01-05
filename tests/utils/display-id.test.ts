import { describe, expect, test } from "bun:test";
import { generateDisplayId } from "../../src/utils/display-id";

describe("generateDisplayId", () => {
  test("generates prd-xxxx.1 for first child under PRD", () => {
    const displayId = generateDisplayId({
      prdId: "prd-a1b2",
      siblingCount: 0,
    });
    expect(displayId).toBe("prd-a1b2.1");
  });

  test("generates prd-xxxx.2 for second child under PRD", () => {
    const displayId = generateDisplayId({
      prdId: "prd-a1b2",
      siblingCount: 1,
    });
    expect(displayId).toBe("prd-a1b2.2");
  });

  test("generates prd-xxxx.1.1 for first nested child", () => {
    const displayId = generateDisplayId({
      prdId: "prd-a1b2",
      parentDisplayId: "prd-a1b2.1",
      siblingCount: 0,
    });
    expect(displayId).toBe("prd-a1b2.1.1");
  });

  test("generates prd-xxxx.1.3 for third nested child", () => {
    const displayId = generateDisplayId({
      prdId: "prd-a1b2",
      parentDisplayId: "prd-a1b2.1",
      siblingCount: 2,
    });
    expect(displayId).toBe("prd-a1b2.1.3");
  });

  test("generates deeply nested IDs", () => {
    const displayId = generateDisplayId({
      prdId: "prd-a1b2",
      parentDisplayId: "prd-a1b2.1.2.3",
      siblingCount: 4,
    });
    expect(displayId).toBe("prd-a1b2.1.2.3.5");
  });

  test("returns null if no prdId provided", () => {
    const displayId = generateDisplayId({
      siblingCount: 0,
    });
    expect(displayId).toBeNull();
  });
});
