import { type Migration } from "../migrations";

export const migration: Migration = {
  name: "0002_audit_log",
  sql: `
CREATE TABLE audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fuda_id TEXT NOT NULL,
  operation TEXT NOT NULL,
  field TEXT,
  old_value TEXT,
  new_value TEXT,
  actor TEXT NOT NULL,
  timestamp TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_audit_fuda_id ON audit_log(fuda_id);
CREATE INDEX idx_audit_timestamp ON audit_log(timestamp DESC);
  `.trim(),
};
