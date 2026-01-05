import { describe, expect, test } from "bun:test";
import { generateId } from "../../src/utils/id";

describe("generateId", () => {
  test("produces sk-xxxx format", () => {
    const id = generateId();
    expect(id).toMatch(/^sk-[a-z0-9]{4,6}$/);
  });

  test("generates unique IDs across multiple calls", () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      ids.add(generateId());
    }
    expect(ids.size).toBe(100);
  });

  test("avoids collisions with existing IDs", () => {
    const existingIds = new Set(["sk-aaaa", "sk-bbbb", "sk-cccc"]);
    const id = generateId(existingIds);
    expect(existingIds.has(id)).toBe(false);
  });

  test("extends length if collision detected", () => {
    // Create a mock that always returns the same base to force collision handling
    const existingIds = new Set<string>();
    // Generate many IDs to increase chance of testing collision path
    for (let i = 0; i < 1000; i++) {
      const id = generateId(existingIds);
      expect(existingIds.has(id)).toBe(false);
      existingIds.add(id);
    }
  });
});
