import { type Migration } from "../migrations";
import { migration as init } from "./0001_init";
import { migration as auditLog } from "./0002_audit_log";
import { migration as fudaLedger } from "./0003_fuda_ledger";
import { migration as fts5Search } from "./0004_fts5_search";
import { migration as renamePendingToBlocked } from "./0005_rename_pending_to_blocked";

// All migrations in order - add new migrations here
// NOTE: 0006_remove_display_id exists but is not in this list yet.
// It will be added after the code is updated to remove display_id references.
// See: src/db/migrations/0006_remove_display_id.ts
export const allMigrations: Migration[] = [
  init,
  auditLog,
  fudaLedger,
  fts5Search,
  renamePendingToBlocked,
];
