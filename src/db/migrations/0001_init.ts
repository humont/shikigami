import { type Migration } from "../migrations";

export const migration: Migration = {
  name: "0001_init",
  sql: `
CREATE TABLE fuda (
  id TEXT PRIMARY KEY,
  display_id TEXT,
  prd_id TEXT,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'blocked',
  spirit_type TEXT NOT NULL DEFAULT 'shikigami',
  assigned_spirit_id TEXT,
  output_commit_hash TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  failure_context TEXT,
  parent_fuda_id TEXT REFERENCES fuda(id),
  priority INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT,
  deleted_by TEXT,
  delete_reason TEXT
);

CREATE TABLE fuda_dependencies (
  fuda_id TEXT NOT NULL REFERENCES fuda(id) ON DELETE CASCADE,
  depends_on_id TEXT NOT NULL REFERENCES fuda(id) ON DELETE CASCADE,
  dependency_type TEXT NOT NULL DEFAULT 'blocks',
  PRIMARY KEY (fuda_id, depends_on_id)
);

CREATE INDEX idx_fuda_status ON fuda(status);
CREATE INDEX idx_fuda_prd_id ON fuda(prd_id);
CREATE INDEX idx_fuda_priority ON fuda(priority DESC);
CREATE INDEX idx_deps_type ON fuda_dependencies(dependency_type);
  `.trim(),
};
