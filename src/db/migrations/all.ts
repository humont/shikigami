import { type Migration } from "../migrations";
import { migration as init } from "./0001_init";
import { migration as auditLog } from "./0002_audit_log";

// All migrations in order - add new migrations here
export const allMigrations: Migration[] = [
  init,
  auditLog,
];
