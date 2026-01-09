import { type Migration } from "../migrations";
import { migration as init } from "./0001_init";
import { migration as auditLog } from "./0002_audit_log";
import { migration as fudaLedger } from "./0003_fuda_ledger";

// All migrations in order - add new migrations here
export const allMigrations: Migration[] = [
  init,
  auditLog,
  fudaLedger,
];
