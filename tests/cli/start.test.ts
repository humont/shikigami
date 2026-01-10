import { Database } from 'bun:sqlite';
import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { runInit } from '../../src/cli/commands/init';
import { runStart } from '../../src/cli/commands/start';
import { createFuda, getFuda, updateFudaStatus } from '../../src/db/fuda';
import { addFudaDependency } from '../../src/db/dependencies';
import { addEntry, EntryType } from '../../src/db/ledger';
import { DependencyType, FudaStatus } from '../../src/types';

describe('start command', () => {
  let testDir: string;
  let db: Database;

  beforeEach(async () => {
    testDir = mkdtempSync(join(tmpdir(), 'shiki-test-'));
    await runInit({ projectRoot: testDir });
    db = new Database(join(testDir, '.shikigami', 'shiki.db'));
  });

  afterEach(() => {
    db.close();
    rmSync(testDir, { recursive: true, force: true });
  });

  describe('setting fuda status to in_progress', () => {
    test('sets fuda status to in_progress', async () => {
      const fuda = createFuda(db, {
        title: 'Test task',
        description: 'Test description',
      });

      const result = await runStart({
        projectRoot: testDir,
        id: fuda.id,
      });

      expect(result.success).toBe(true);
      expect(result.fuda).toBeDefined();
      expect(result.fuda!.status).toBe(FudaStatus.IN_PROGRESS);

      // Verify in database
      const updated = getFuda(db, fuda.id);
      expect(updated!.status).toBe(FudaStatus.IN_PROGRESS);
    });

    test('works with ID prefix matching', async () => {
      const fuda = createFuda(db, {
        title: 'Test task',
        description: 'Test description',
      });
      // Extract prefix without sk- (e.g., "sk-abc123" -> "abc1")
      const prefix = fuda.id.replace('sk-', '').substring(0, 4);

      const result = await runStart({
        projectRoot: testDir,
        id: prefix,
      });

      expect(result.success).toBe(true);
      expect(result.fuda!.id).toBe(fuda.id);
      expect(result.fuda!.status).toBe(FudaStatus.IN_PROGRESS);
    });
  });

  describe('assigned-spirit-id flag', () => {
    test('supports --assigned-spirit-id flag', async () => {
      const fuda = createFuda(db, {
        title: 'Test task',
        description: 'Test description',
      });

      const result = await runStart({
        projectRoot: testDir,
        id: fuda.id,
        assignedSpiritId: 'agent-123',
      });

      expect(result.success).toBe(true);
      expect(result.fuda!.status).toBe(FudaStatus.IN_PROGRESS);
      expect(result.fuda!.assignedSpiritId).toBe('agent-123');

      // Verify in database
      const updated = getFuda(db, fuda.id);
      expect(updated!.assignedSpiritId).toBe('agent-123');
    });
  });

  describe('JSON output format', () => {
    test('returns proper JSON output', async () => {
      const fuda = createFuda(db, {
        title: 'Test task',
        description: 'Test description',
      });

      const result = await runStart({
        projectRoot: testDir,
        id: fuda.id,
      });

      // Should be JSON serializable
      const json = JSON.stringify(result);
      expect(json).toBeDefined();

      const parsed = JSON.parse(json);
      expect(parsed.success).toBe(true);
      expect(parsed.fuda).toBeDefined();
      expect(parsed.fuda.status).toBe(FudaStatus.IN_PROGRESS);
    });
  });

  describe('error when fuda not found', () => {
    test('returns error when fuda does not exist', async () => {
      const result = await runStart({
        projectRoot: testDir,
        id: '[REDACTED:sk-secret]',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    test('returns error when prefix matches no fuda', async () => {
      const result = await runStart({
        projectRoot: testDir,
        id: 'xyz',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('error when shiki not initialized', () => {
    test('returns error when shiki not initialized', async () => {
      const uninitializedDir = mkdtempSync(join(tmpdir(), 'shiki-uninit-'));

      try {
        const result = await runStart({
          projectRoot: uninitializedDir,
          id: 'sk-test',
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('not initialized');
      } finally {
        rmSync(uninitializedDir, { recursive: true, force: true });
      }
    });
  });

  describe('claim protection', () => {
    test('fails when fuda is already in_progress', async () => {
      const fuda = createFuda(db, {
        title: 'Test task',
        description: 'Test description',
      });
      updateFudaStatus(db, fuda.id, FudaStatus.IN_PROGRESS);

      const result = await runStart({
        projectRoot: testDir,
        id: fuda.id,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('already being worked on');
    });

    test('fails when fuda status is done', async () => {
      const fuda = createFuda(db, {
        title: 'Test task',
        description: 'Test description',
      });
      updateFudaStatus(db, fuda.id, FudaStatus.DONE);

      const result = await runStart({
        projectRoot: testDir,
        id: fuda.id,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Cannot start fuda');
      expect(result.error).toContain('done');
    });

    test('fails when fuda status is failed', async () => {
      const fuda = createFuda(db, {
        title: 'Test task',
        description: 'Test description',
      });
      updateFudaStatus(db, fuda.id, FudaStatus.FAILED);

      const result = await runStart({
        projectRoot: testDir,
        id: fuda.id,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Cannot start fuda');
      expect(result.error).toContain('failed');
    });

    test('error message hints to find other work', async () => {
      const fuda = createFuda(db, {
        title: 'Test task',
        description: 'Test description',
      });
      updateFudaStatus(db, fuda.id, FudaStatus.IN_PROGRESS);

      const result = await runStart({
        projectRoot: testDir,
        id: fuda.id,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('shiki ready');
    });
  });

  describe('ledger context in JSON output', () => {
    test('output includes context.handoffs array', async () => {
      const fuda = createFuda(db, {
        title: 'Test task',
        description: 'Test description',
      });

      const result = await runStart({
        projectRoot: testDir,
        id: fuda.id,
      });

      expect(result.success).toBe(true);
      expect(result.context).toBeDefined();
      expect(result.context!.handoffs).toBeDefined();
      expect(Array.isArray(result.context!.handoffs)).toBe(true);
    });

    test('output includes context.learnings array', async () => {
      const fuda = createFuda(db, {
        title: 'Test task',
        description: 'Test description',
      });

      const result = await runStart({
        projectRoot: testDir,
        id: fuda.id,
      });

      expect(result.success).toBe(true);
      expect(result.context).toBeDefined();
      expect(result.context!.learnings).toBeDefined();
      expect(Array.isArray(result.context!.learnings)).toBe(true);
    });

    test('handoffs array contains handoff entries from predecessor fudas', async () => {
      // Create predecessor and mark as done
      const predecessor = createFuda(db, {
        title: 'Predecessor task',
        description: 'Blocks the main task',
      });
      updateFudaStatus(db, predecessor.id, FudaStatus.DONE);

      addEntry(db, {
        fudaId: predecessor.id,
        entryType: EntryType.HANDOFF,
        content: 'First handoff note',
        spiritId: 'agent-1',
      });
      addEntry(db, {
        fudaId: predecessor.id,
        entryType: EntryType.HANDOFF,
        content: 'Second handoff note',
        spiritId: 'agent-2',
      });

      // Create current fuda that depends on predecessor
      const fuda = createFuda(db, {
        title: 'Test task',
        description: 'Test description',
      });
      addFudaDependency(db, fuda.id, predecessor.id, DependencyType.BLOCKS);

      const result = await runStart({
        projectRoot: testDir,
        id: fuda.id,
      });

      expect(result.success).toBe(true);
      expect(result.context!.handoffs).toHaveLength(2);
      expect(result.context!.handoffs[0].content).toBe('First handoff note');
      expect(result.context!.handoffs[1].content).toBe('Second handoff note');
    });

    test('learnings array contains learning entries for the fuda', async () => {
      const fuda = createFuda(db, {
        title: 'Test task',
        description: 'Test description',
      });

      addEntry(db, {
        fudaId: fuda.id,
        entryType: EntryType.LEARNING,
        content: 'Discovered API requires auth',
        spiritId: 'agent-1',
      });
      addEntry(db, {
        fudaId: fuda.id,
        entryType: EntryType.LEARNING,
        content: 'Found edge case in validation',
      });

      const result = await runStart({
        projectRoot: testDir,
        id: fuda.id,
      });

      expect(result.success).toBe(true);
      expect(result.context!.learnings).toHaveLength(2);
      expect(result.context!.learnings[0].content).toBe(
        'Discovered API requires auth'
      );
      expect(result.context!.learnings[1].content).toBe(
        'Found edge case in validation'
      );
    });

    test('empty arrays when fuda has no ledger entries', async () => {
      const fuda = createFuda(db, {
        title: 'Test task',
        description: 'Test description',
      });

      const result = await runStart({
        projectRoot: testDir,
        id: fuda.id,
      });

      expect(result.success).toBe(true);
      expect(result.context!.handoffs).toEqual([]);
      expect(result.context!.learnings).toEqual([]);
    });

    test('context entries include id, content, spiritId, createdAt, and sourceFudaId', async () => {
      // Create predecessor and mark as done
      const predecessor = createFuda(db, {
        title: 'Predecessor task',
        description: 'Blocks the main task',
      });
      updateFudaStatus(db, predecessor.id, FudaStatus.DONE);

      addEntry(db, {
        fudaId: predecessor.id,
        entryType: EntryType.HANDOFF,
        content: 'Handoff with all fields',
        spiritId: 'agent-123',
      });

      // Create current fuda that depends on predecessor
      const fuda = createFuda(db, {
        title: 'Test task',
        description: 'Test description',
      });
      addFudaDependency(db, fuda.id, predecessor.id, DependencyType.BLOCKS);

      const result = await runStart({
        projectRoot: testDir,
        id: fuda.id,
      });

      expect(result.success).toBe(true);
      const handoff = result.context!.handoffs[0];
      expect(handoff.id).toBeDefined();
      expect(handoff.id).toMatch(/^sk-/);
      expect(handoff.content).toBe('Handoff with all fields');
      expect(handoff.spiritId).toBe('agent-123');
      expect(handoff.createdAt).toBeDefined();
      expect(handoff.sourceFudaId).toBe(predecessor.id);
    });

    test('context entries without spiritId have null spiritId', async () => {
      const fuda = createFuda(db, {
        title: 'Test task',
        description: 'Test description',
      });

      addEntry(db, {
        fudaId: fuda.id,
        entryType: EntryType.LEARNING,
        content: 'Learning without spirit',
      });

      const result = await runStart({
        projectRoot: testDir,
        id: fuda.id,
      });

      expect(result.success).toBe(true);
      const learning = result.context!.learnings[0];
      expect(learning.spiritId).toBeNull();
    });

    test('does not include handoffs from non-blocking fuda', async () => {
      // Create predecessor (blocking) and mark as done
      const predecessor = createFuda(db, {
        title: 'Predecessor',
        description: 'Blocks the main task',
      });
      updateFudaStatus(db, predecessor.id, FudaStatus.DONE);
      addEntry(db, {
        fudaId: predecessor.id,
        entryType: EntryType.HANDOFF,
        content: 'Predecessor handoff',
      });

      // Create unrelated fuda (not a dependency)
      const unrelatedFuda = createFuda(db, {
        title: 'Unrelated',
        description: 'Not connected',
      });
      updateFudaStatus(db, unrelatedFuda.id, FudaStatus.DONE);
      addEntry(db, {
        fudaId: unrelatedFuda.id,
        entryType: EntryType.HANDOFF,
        content: 'Unrelated handoff',
      });

      // Create current fuda that only depends on predecessor
      const currentFuda = createFuda(db, {
        title: 'Current',
        description: 'Test description',
      });
      addFudaDependency(db, currentFuda.id, predecessor.id, DependencyType.BLOCKS);

      const result = await runStart({
        projectRoot: testDir,
        id: currentFuda.id,
      });

      expect(result.success).toBe(true);
      expect(result.context!.handoffs).toHaveLength(1);
      expect(result.context!.handoffs[0].content).toBe('Predecessor handoff');
    });
  });

  describe('predecessor handoffs', () => {
    test('handoffs come from completed predecessor fudas with blocks dependency', async () => {
      // Create predecessor fuda and mark as done
      const predecessor = createFuda(db, {
        title: 'Predecessor task',
        description: 'This task blocks the main task',
      });
      updateFudaStatus(db, predecessor.id, FudaStatus.DONE);

      // Add handoff to predecessor
      addEntry(db, {
        fudaId: predecessor.id,
        entryType: EntryType.HANDOFF,
        content: 'Important context from predecessor',
        spiritId: 'agent-1',
      });

      // Create current fuda that depends on predecessor
      const currentFuda = createFuda(db, {
        title: 'Current task',
        description: 'This task is blocked by predecessor',
      });
      addFudaDependency(db, currentFuda.id, predecessor.id, DependencyType.BLOCKS);

      const result = await runStart({
        projectRoot: testDir,
        id: currentFuda.id,
      });

      expect(result.success).toBe(true);
      expect(result.context!.handoffs).toHaveLength(1);
      expect(result.context!.handoffs[0].content).toBe(
        'Important context from predecessor'
      );
    });

    test('handoffs come from predecessor fudas with parent-child dependency', async () => {
      // Create parent fuda and mark as done
      const parent = createFuda(db, {
        title: 'Parent task',
        description: 'Parent of current task',
      });
      updateFudaStatus(db, parent.id, FudaStatus.DONE);

      // Add handoff to parent
      addEntry(db, {
        fudaId: parent.id,
        entryType: EntryType.HANDOFF,
        content: 'Handoff from parent',
        spiritId: 'agent-1',
      });

      // Create current fuda with parent-child dependency
      const currentFuda = createFuda(db, {
        title: 'Child task',
        description: 'Child of parent task',
      });
      addFudaDependency(db, currentFuda.id, parent.id, DependencyType.PARENT_CHILD);

      const result = await runStart({
        projectRoot: testDir,
        id: currentFuda.id,
      });

      expect(result.success).toBe(true);
      expect(result.context!.handoffs).toHaveLength(1);
      expect(result.context!.handoffs[0].content).toBe('Handoff from parent');
    });

    test('multiple predecessors contribute handoffs', async () => {
      // Create first predecessor
      const predecessor1 = createFuda(db, {
        title: 'First predecessor',
        description: 'First blocking task',
      });
      updateFudaStatus(db, predecessor1.id, FudaStatus.DONE);
      addEntry(db, {
        fudaId: predecessor1.id,
        entryType: EntryType.HANDOFF,
        content: 'Handoff from first predecessor',
        spiritId: 'agent-1',
      });

      // Create second predecessor
      const predecessor2 = createFuda(db, {
        title: 'Second predecessor',
        description: 'Second blocking task',
      });
      updateFudaStatus(db, predecessor2.id, FudaStatus.DONE);
      addEntry(db, {
        fudaId: predecessor2.id,
        entryType: EntryType.HANDOFF,
        content: 'Handoff from second predecessor',
        spiritId: 'agent-2',
      });

      // Create current fuda that depends on both predecessors
      const currentFuda = createFuda(db, {
        title: 'Current task',
        description: 'Depends on both predecessors',
      });
      addFudaDependency(db, currentFuda.id, predecessor1.id, DependencyType.BLOCKS);
      addFudaDependency(db, currentFuda.id, predecessor2.id, DependencyType.BLOCKS);

      const result = await runStart({
        projectRoot: testDir,
        id: currentFuda.id,
      });

      expect(result.success).toBe(true);
      expect(result.context!.handoffs).toHaveLength(2);
      const contents = result.context!.handoffs.map((h) => h.content);
      expect(contents).toContain('Handoff from first predecessor');
      expect(contents).toContain('Handoff from second predecessor');
    });

    test('handoff entries include sourceFudaId', async () => {
      // Create predecessor fuda and mark as done
      const predecessor = createFuda(db, {
        title: 'Predecessor task',
        description: 'This task blocks the main task',
      });
      updateFudaStatus(db, predecessor.id, FudaStatus.DONE);

      // Add handoff to predecessor
      addEntry(db, {
        fudaId: predecessor.id,
        entryType: EntryType.HANDOFF,
        content: 'Context from predecessor',
        spiritId: 'agent-1',
      });

      // Create current fuda that depends on predecessor
      const currentFuda = createFuda(db, {
        title: 'Current task',
        description: 'This task is blocked by predecessor',
      });
      addFudaDependency(db, currentFuda.id, predecessor.id, DependencyType.BLOCKS);

      const result = await runStart({
        projectRoot: testDir,
        id: currentFuda.id,
      });

      expect(result.success).toBe(true);
      expect(result.context!.handoffs).toHaveLength(1);
      expect(result.context!.handoffs[0]).toHaveProperty('sourceFudaId');
      expect(result.context!.handoffs[0].sourceFudaId).toBe(predecessor.id);
    });

    test('learnings still come from current fuda, not predecessors', async () => {
      // Create predecessor fuda and mark as done
      const predecessor = createFuda(db, {
        title: 'Predecessor task',
        description: 'This task blocks the main task',
      });
      updateFudaStatus(db, predecessor.id, FudaStatus.DONE);

      // Add learning to predecessor (should NOT appear in current fuda's learnings)
      addEntry(db, {
        fudaId: predecessor.id,
        entryType: EntryType.LEARNING,
        content: 'Learning from predecessor',
        spiritId: 'agent-1',
      });

      // Create current fuda that depends on predecessor
      const currentFuda = createFuda(db, {
        title: 'Current task',
        description: 'This task is blocked by predecessor',
      });
      addFudaDependency(db, currentFuda.id, predecessor.id, DependencyType.BLOCKS);

      // Add learning to current fuda (should appear)
      addEntry(db, {
        fudaId: currentFuda.id,
        entryType: EntryType.LEARNING,
        content: 'Learning from current fuda',
        spiritId: 'agent-2',
      });

      const result = await runStart({
        projectRoot: testDir,
        id: currentFuda.id,
      });

      expect(result.success).toBe(true);
      expect(result.context!.learnings).toHaveLength(1);
      expect(result.context!.learnings[0].content).toBe('Learning from current fuda');
    });

    test('related dependencies do not contribute handoffs', async () => {
      // Create related fuda and mark as done
      const relatedFuda = createFuda(db, {
        title: 'Related task',
        description: 'Related but not blocking',
      });
      updateFudaStatus(db, relatedFuda.id, FudaStatus.DONE);

      // Add handoff to related fuda
      addEntry(db, {
        fudaId: relatedFuda.id,
        entryType: EntryType.HANDOFF,
        content: 'Handoff from related fuda',
        spiritId: 'agent-1',
      });

      // Create current fuda with related dependency
      const currentFuda = createFuda(db, {
        title: 'Current task',
        description: 'Has a related fuda',
      });
      addFudaDependency(db, currentFuda.id, relatedFuda.id, DependencyType.RELATED);

      const result = await runStart({
        projectRoot: testDir,
        id: currentFuda.id,
      });

      expect(result.success).toBe(true);
      expect(result.context!.handoffs).toHaveLength(0);
    });

    test('discovered-from dependencies do not contribute handoffs', async () => {
      // Create source fuda and mark as done
      const sourceFuda = createFuda(db, {
        title: 'Source task',
        description: 'Discovered from this task',
      });
      updateFudaStatus(db, sourceFuda.id, FudaStatus.DONE);

      // Add handoff to source fuda
      addEntry(db, {
        fudaId: sourceFuda.id,
        entryType: EntryType.HANDOFF,
        content: 'Handoff from source fuda',
        spiritId: 'agent-1',
      });

      // Create current fuda with discovered-from dependency
      const currentFuda = createFuda(db, {
        title: 'Current task',
        description: 'Discovered from source',
      });
      addFudaDependency(
        db,
        currentFuda.id,
        sourceFuda.id,
        DependencyType.DISCOVERED_FROM
      );

      const result = await runStart({
        projectRoot: testDir,
        id: currentFuda.id,
      });

      expect(result.success).toBe(true);
      expect(result.context!.handoffs).toHaveLength(0);
    });

    test('handoffs from current fuda are not included (only predecessors)', async () => {
      // Create predecessor fuda and mark as done
      const predecessor = createFuda(db, {
        title: 'Predecessor task',
        description: 'This task blocks the main task',
      });
      updateFudaStatus(db, predecessor.id, FudaStatus.DONE);

      // Add handoff to predecessor
      addEntry(db, {
        fudaId: predecessor.id,
        entryType: EntryType.HANDOFF,
        content: 'Handoff from predecessor',
        spiritId: 'agent-1',
      });

      // Create current fuda that depends on predecessor
      const currentFuda = createFuda(db, {
        title: 'Current task',
        description: 'This task is blocked by predecessor',
      });
      addFudaDependency(db, currentFuda.id, predecessor.id, DependencyType.BLOCKS);

      // Add handoff to current fuda (should NOT appear since it's not a predecessor)
      addEntry(db, {
        fudaId: currentFuda.id,
        entryType: EntryType.HANDOFF,
        content: 'Handoff from current fuda',
        spiritId: 'agent-2',
      });

      const result = await runStart({
        projectRoot: testDir,
        id: currentFuda.id,
      });

      expect(result.success).toBe(true);
      expect(result.context!.handoffs).toHaveLength(1);
      expect(result.context!.handoffs[0].content).toBe('Handoff from predecessor');
    });

    test('empty handoffs when fuda has no blocking dependencies', async () => {
      const currentFuda = createFuda(db, {
        title: 'Standalone task',
        description: 'No dependencies',
      });

      const result = await runStart({
        projectRoot: testDir,
        id: currentFuda.id,
      });

      expect(result.success).toBe(true);
      expect(result.context!.handoffs).toEqual([]);
    });
  });
});
