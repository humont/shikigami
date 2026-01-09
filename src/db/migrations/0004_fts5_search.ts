import { type Migration } from "../migrations";

export const migration: Migration = {
  name: "0004_fts5_search",
  sql: `
-- FTS5 virtual table for fuda search (title + description)
-- Using standalone table (not content=) for simpler sync
CREATE VIRTUAL TABLE fuda_fts USING fts5(
  id,
  title,
  description
);

-- Populate fuda_fts with existing data (only non-deleted)
INSERT INTO fuda_fts(id, title, description)
SELECT id, title, description FROM fuda WHERE deleted_at IS NULL;

-- Trigger: sync on INSERT
CREATE TRIGGER fuda_fts_insert AFTER INSERT ON fuda
WHEN NEW.deleted_at IS NULL
BEGIN
  INSERT INTO fuda_fts(id, title, description)
  VALUES (NEW.id, NEW.title, NEW.description);
END;

-- Trigger: sync on UPDATE (handles both content changes and soft-delete/restore)
CREATE TRIGGER fuda_fts_update AFTER UPDATE ON fuda BEGIN
  -- Remove old entry
  DELETE FROM fuda_fts WHERE id = OLD.id;
  -- Re-add only if not soft-deleted
  INSERT INTO fuda_fts(id, title, description)
  SELECT NEW.id, NEW.title, NEW.description
  WHERE NEW.deleted_at IS NULL;
END;

-- Trigger: sync on DELETE
CREATE TRIGGER fuda_fts_delete AFTER DELETE ON fuda BEGIN
  DELETE FROM fuda_fts WHERE id = OLD.id;
END;

-- FTS5 virtual table for ledger search (content)
CREATE VIRTUAL TABLE fuda_ledger_fts USING fts5(
  id,
  fuda_id,
  content
);

-- Populate fuda_ledger_fts with existing data
INSERT INTO fuda_ledger_fts(id, fuda_id, content)
SELECT id, fuda_id, content FROM fuda_ledger;

-- Trigger: sync on INSERT
CREATE TRIGGER fuda_ledger_fts_insert AFTER INSERT ON fuda_ledger BEGIN
  INSERT INTO fuda_ledger_fts(id, fuda_id, content)
  VALUES (NEW.id, NEW.fuda_id, NEW.content);
END;

-- Trigger: sync on UPDATE
CREATE TRIGGER fuda_ledger_fts_update AFTER UPDATE ON fuda_ledger BEGIN
  DELETE FROM fuda_ledger_fts WHERE id = OLD.id;
  INSERT INTO fuda_ledger_fts(id, fuda_id, content)
  VALUES (NEW.id, NEW.fuda_id, NEW.content);
END;

-- Trigger: sync on DELETE
CREATE TRIGGER fuda_ledger_fts_delete AFTER DELETE ON fuda_ledger BEGIN
  DELETE FROM fuda_ledger_fts WHERE id = OLD.id;
END;

-- Trigger: cascade delete ledger FTS entries when parent fuda is deleted
CREATE TRIGGER fuda_ledger_fts_cascade_delete BEFORE DELETE ON fuda BEGIN
  DELETE FROM fuda_ledger_fts WHERE fuda_id = OLD.id;
  DELETE FROM fuda_ledger WHERE fuda_id = OLD.id;
END;
  `.trim(),
};
