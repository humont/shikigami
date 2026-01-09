import { type Migration } from "../migrations";

export const migration: Migration = {
  name: "0003_fuda_ledger",
  sql: `
CREATE TABLE fuda_ledger (
  id TEXT PRIMARY KEY,
  fuda_id TEXT NOT NULL,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('handoff', 'learning')),
  content TEXT NOT NULL,
  spirit_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (fuda_id) REFERENCES fuda(id)
);

CREATE INDEX idx_ledger_fuda_id ON fuda_ledger(fuda_id);
CREATE INDEX idx_ledger_entry_type ON fuda_ledger(entry_type);
  `.trim(),
};
