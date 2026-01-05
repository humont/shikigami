import { describe, expect, test } from "bun:test";
import { runAgentGuide } from "../../src/cli/commands/agent-guide";

describe("agent-guide command", () => {
  test("outputs agent workflow guide content", async () => {
    const result = await runAgentGuide();

    expect(result.success).toBe(true);
    expect(result.content).toBeDefined();
    expect(typeof result.content).toBe("string");
    expect(result.content!.length).toBeGreaterThan(100);
  });

  test("works without requiring shiki init (no database needed)", async () => {
    // Should succeed even with no projectRoot or database
    const result = await runAgentGuide();

    expect(result.success).toBe(true);
    // No error about missing database
    expect(result.error).toBeUndefined();
  });

  test("includes core concepts section", async () => {
    const result = await runAgentGuide();

    expect(result.content).toContain("Core Concepts");
    expect(result.content).toContain("Fuda");
    expect(result.content).toContain("Spirit Types");
    expect(result.content).toContain("shikigami");
    expect(result.content).toContain("tengu");
    expect(result.content).toContain("kitsune");
  });

  test("includes workflow steps", async () => {
    const result = await runAgentGuide();

    expect(result.content).toContain("Agent Workflow");
    expect(result.content).toContain("Initialize");
    expect(result.content).toContain("shiki init");
    expect(result.content).toContain("shiki ready");
  });

  test("includes CLI reference", async () => {
    const result = await runAgentGuide();

    expect(result.content).toContain("CLI Reference");
    expect(result.content).toContain("shiki add");
    expect(result.content).toContain("shiki show");
    expect(result.content).toContain("shiki deps");
  });

  test("includes status information", async () => {
    const result = await runAgentGuide();

    expect(result.content).toContain("pending");
    expect(result.content).toContain("ready");
    expect(result.content).toContain("in_progress");
    expect(result.content).toContain("done");
    expect(result.content).toContain("failed");
  });

  test("includes dependency types", async () => {
    const result = await runAgentGuide();

    expect(result.content).toContain("blocks");
    expect(result.content).toContain("parent-child");
    expect(result.content).toContain("related");
    expect(result.content).toContain("discovered-from");
  });

  test("returns JSON-serializable result", async () => {
    const result = await runAgentGuide();

    // Should be JSON serializable
    const json = JSON.stringify(result);
    expect(json).toBeDefined();

    const parsed = JSON.parse(json);
    expect(parsed.success).toBe(true);
    expect(parsed.content).toBeDefined();
  });

  test("supports json format option", async () => {
    const result = await runAgentGuide({ json: true });

    expect(result.success).toBe(true);
    // When json option is true, content should be a structured object
    expect(result.structured).toBeDefined();
    expect(result.structured!.coreConcepts).toBeDefined();
    expect(result.structured!.workflow).toBeDefined();
    expect(result.structured!.cliReference).toBeDefined();
  });

  test("json format includes all sections", async () => {
    const result = await runAgentGuide({ json: true });

    const structured = result.structured!;

    // Core concepts
    expect(structured.coreConcepts.fuda).toBeDefined();
    expect(structured.coreConcepts.spiritTypes).toContain("shikigami");
    expect(structured.coreConcepts.spiritTypes).toContain("tengu");
    expect(structured.coreConcepts.spiritTypes).toContain("kitsune");
    expect(structured.coreConcepts.dependencyTypes).toContain("blocks");

    // Workflow
    expect(Array.isArray(structured.workflow)).toBe(true);
    expect(structured.workflow.length).toBeGreaterThan(0);

    // CLI reference
    expect(structured.cliReference.commands).toBeDefined();
    expect(Array.isArray(structured.cliReference.commands)).toBe(true);
  });

  test("includes best practices", async () => {
    const result = await runAgentGuide();

    expect(result.content).toContain("Best Practices");
    expect(result.content).toContain("--json");
  });

  test("includes ID format documentation", async () => {
    const result = await runAgentGuide();

    expect(result.content).toContain("ID");
    expect(result.content).toContain("sk-");
  });
});
