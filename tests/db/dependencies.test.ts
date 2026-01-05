import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { Database } from "bun:sqlite";
import { initializeDb } from "../../src/db/index";
import { createFuda, getFuda, updateFudaStatus } from "../../src/db/fuda";
import {
  addFudaDependency,
  removeFudaDependency,
  getFudaDependencies,
  getFudaDependenciesFull,
  getBlockingDependencies,
  getFudaDependents,
  areAllDependenciesDone,
  updateReadyFuda,
} from "../../src/db/dependencies";
import { FudaStatus, DependencyType } from "../../src/types";

describe("dependencies", () => {
  let db: Database;

  beforeEach(() => {
    db = new Database(":memory:");
    initializeDb(db);
  });

  afterEach(() => {
    db.close();
  });

  describe("addFudaDependency", () => {
    test("creates dependency link", () => {
      const fudaA = createFuda(db, { title: "A", description: "Desc" });
      const fudaB = createFuda(db, { title: "B", description: "Desc" });

      addFudaDependency(db, fudaB.id, fudaA.id);

      const deps = getFudaDependencies(db, fudaB.id);
      expect(deps).toContain(fudaA.id);
    });

    test("accepts dependency type", () => {
      const fudaA = createFuda(db, { title: "A", description: "Desc" });
      const fudaB = createFuda(db, { title: "B", description: "Desc" });

      addFudaDependency(db, fudaB.id, fudaA.id, DependencyType.RELATED);

      const deps = getFudaDependenciesFull(db, fudaB.id);
      expect(deps[0].type).toBe(DependencyType.RELATED);
    });

    test("defaults to blocks type", () => {
      const fudaA = createFuda(db, { title: "A", description: "Desc" });
      const fudaB = createFuda(db, { title: "B", description: "Desc" });

      addFudaDependency(db, fudaB.id, fudaA.id);

      const deps = getFudaDependenciesFull(db, fudaB.id);
      expect(deps[0].type).toBe(DependencyType.BLOCKS);
    });
  });

  describe("removeFudaDependency", () => {
    test("removes dependency link", () => {
      const fudaA = createFuda(db, { title: "A", description: "Desc" });
      const fudaB = createFuda(db, { title: "B", description: "Desc" });

      addFudaDependency(db, fudaB.id, fudaA.id);
      removeFudaDependency(db, fudaB.id, fudaA.id);

      const deps = getFudaDependencies(db, fudaB.id);
      expect(deps).not.toContain(fudaA.id);
    });
  });

  describe("getFudaDependencies", () => {
    test("returns all dependency IDs", () => {
      const fudaA = createFuda(db, { title: "A", description: "Desc" });
      const fudaB = createFuda(db, { title: "B", description: "Desc" });
      const fudaC = createFuda(db, { title: "C", description: "Desc" });

      addFudaDependency(db, fudaC.id, fudaA.id);
      addFudaDependency(db, fudaC.id, fudaB.id);

      const deps = getFudaDependencies(db, fudaC.id);
      expect(deps).toHaveLength(2);
      expect(deps).toContain(fudaA.id);
      expect(deps).toContain(fudaB.id);
    });
  });

  describe("getBlockingDependencies", () => {
    test("filters to blocks and parent-child only", () => {
      const fudaA = createFuda(db, { title: "A", description: "Desc" });
      const fudaB = createFuda(db, { title: "B", description: "Desc" });
      const fudaC = createFuda(db, { title: "C", description: "Desc" });
      const fudaD = createFuda(db, { title: "D", description: "Desc" });

      addFudaDependency(db, fudaD.id, fudaA.id, DependencyType.BLOCKS);
      addFudaDependency(db, fudaD.id, fudaB.id, DependencyType.PARENT_CHILD);
      addFudaDependency(db, fudaD.id, fudaC.id, DependencyType.RELATED);

      const blocking = getBlockingDependencies(db, fudaD.id);
      expect(blocking).toHaveLength(2);

      const blockingIds = blocking.map((d) => d.dependsOnId);
      expect(blockingIds).toContain(fudaA.id);
      expect(blockingIds).toContain(fudaB.id);
      expect(blockingIds).not.toContain(fudaC.id);
    });
  });

  describe("getFudaDependents", () => {
    test("returns fuda that depend on this one", () => {
      const fudaA = createFuda(db, { title: "A", description: "Desc" });
      const fudaB = createFuda(db, { title: "B", description: "Desc" });
      const fudaC = createFuda(db, { title: "C", description: "Desc" });

      addFudaDependency(db, fudaB.id, fudaA.id);
      addFudaDependency(db, fudaC.id, fudaA.id);

      const dependents = getFudaDependents(db, fudaA.id);
      expect(dependents).toHaveLength(2);
      expect(dependents).toContain(fudaB.id);
      expect(dependents).toContain(fudaC.id);
    });
  });

  describe("areAllDependenciesDone", () => {
    test("returns true when all blocking deps are done", () => {
      const fudaA = createFuda(db, { title: "A", description: "Desc" });
      const fudaB = createFuda(db, { title: "B", description: "Desc" });

      addFudaDependency(db, fudaB.id, fudaA.id, DependencyType.BLOCKS);
      updateFudaStatus(db, fudaA.id, FudaStatus.DONE);

      expect(areAllDependenciesDone(db, fudaB.id)).toBe(true);
    });

    test("returns false when blocking deps not done", () => {
      const fudaA = createFuda(db, { title: "A", description: "Desc" });
      const fudaB = createFuda(db, { title: "B", description: "Desc" });

      addFudaDependency(db, fudaB.id, fudaA.id, DependencyType.BLOCKS);

      expect(areAllDependenciesDone(db, fudaB.id)).toBe(false);
    });

    test("ignores non-blocking deps", () => {
      const fudaA = createFuda(db, { title: "A", description: "Desc" });
      const fudaB = createFuda(db, { title: "B", description: "Desc" });

      addFudaDependency(db, fudaB.id, fudaA.id, DependencyType.RELATED);
      // fudaA is still pending but it's a related dep, not blocking

      expect(areAllDependenciesDone(db, fudaB.id)).toBe(true);
    });

    test("returns true when no dependencies", () => {
      const fuda = createFuda(db, { title: "Solo", description: "Desc" });
      expect(areAllDependenciesDone(db, fuda.id)).toBe(true);
    });
  });

  describe("multi-parent dependencies", () => {
    test("C depends on A AND B independently", () => {
      const fudaA = createFuda(db, { title: "A", description: "Desc" });
      const fudaB = createFuda(db, { title: "B", description: "Desc" });
      const fudaC = createFuda(db, { title: "C", description: "Desc" });

      addFudaDependency(db, fudaC.id, fudaA.id, DependencyType.BLOCKS);
      addFudaDependency(db, fudaC.id, fudaB.id, DependencyType.BLOCKS);

      // Neither done
      expect(areAllDependenciesDone(db, fudaC.id)).toBe(false);

      // Only A done
      updateFudaStatus(db, fudaA.id, FudaStatus.DONE);
      expect(areAllDependenciesDone(db, fudaC.id)).toBe(false);

      // Both done
      updateFudaStatus(db, fudaB.id, FudaStatus.DONE);
      expect(areAllDependenciesDone(db, fudaC.id)).toBe(true);
    });

    test("A and B are independent (no dependency between them)", () => {
      const fudaA = createFuda(db, { title: "A", description: "Desc" });
      const fudaB = createFuda(db, { title: "B", description: "Desc" });
      const fudaC = createFuda(db, { title: "C", description: "Desc" });

      addFudaDependency(db, fudaC.id, fudaA.id, DependencyType.BLOCKS);
      addFudaDependency(db, fudaC.id, fudaB.id, DependencyType.BLOCKS);

      // A has no dependencies
      expect(areAllDependenciesDone(db, fudaA.id)).toBe(true);
      // B has no dependencies
      expect(areAllDependenciesDone(db, fudaB.id)).toBe(true);
    });
  });

  describe("updateReadyFuda", () => {
    test("transitions pending to ready when deps done", () => {
      const fudaA = createFuda(db, { title: "A", description: "Desc" });
      const fudaB = createFuda(db, { title: "B", description: "Desc" });

      addFudaDependency(db, fudaB.id, fudaA.id, DependencyType.BLOCKS);
      updateFudaStatus(db, fudaA.id, FudaStatus.DONE);

      const count = updateReadyFuda(db);
      expect(count).toBe(1);

      const updated = getFuda(db, fudaB.id);
      expect(updated!.status).toBe(FudaStatus.READY);
    });

    test("does not transition if deps not done", () => {
      const fudaA = createFuda(db, { title: "A", description: "Desc" });
      const fudaB = createFuda(db, { title: "B", description: "Desc" });

      addFudaDependency(db, fudaB.id, fudaA.id, DependencyType.BLOCKS);

      const count = updateReadyFuda(db);
      // fudaA has no deps so it becomes ready, but fudaB should not
      expect(count).toBe(1);

      const updatedA = getFuda(db, fudaA.id);
      expect(updatedA!.status).toBe(FudaStatus.READY);

      const updatedB = getFuda(db, fudaB.id);
      expect(updatedB!.status).toBe(FudaStatus.PENDING);
    });

    test("transitions fuda with no dependencies", () => {
      createFuda(db, { title: "Solo", description: "Desc" });

      const count = updateReadyFuda(db);
      expect(count).toBe(1);
    });

    test("handles complex dependency graph", () => {
      // A -> B -> D
      //      C -> D
      const fudaA = createFuda(db, { title: "A", description: "Desc" });
      const fudaB = createFuda(db, { title: "B", description: "Desc" });
      const fudaC = createFuda(db, { title: "C", description: "Desc" });
      const fudaD = createFuda(db, { title: "D", description: "Desc" });

      addFudaDependency(db, fudaB.id, fudaA.id, DependencyType.BLOCKS);
      addFudaDependency(db, fudaD.id, fudaB.id, DependencyType.BLOCKS);
      addFudaDependency(db, fudaD.id, fudaC.id, DependencyType.BLOCKS);

      // Initially only A and C can be ready (no deps)
      let count = updateReadyFuda(db);
      expect(count).toBe(2); // A and C

      // Complete A, now B can be ready
      updateFudaStatus(db, fudaA.id, FudaStatus.DONE);
      count = updateReadyFuda(db);
      expect(count).toBe(1); // B

      // Complete B and C, now D can be ready
      updateFudaStatus(db, fudaB.id, FudaStatus.DONE);
      updateFudaStatus(db, fudaC.id, FudaStatus.DONE);
      count = updateReadyFuda(db);
      expect(count).toBe(1); // D

      const d = getFuda(db, fudaD.id);
      expect(d!.status).toBe(FudaStatus.READY);
    });
  });
});
