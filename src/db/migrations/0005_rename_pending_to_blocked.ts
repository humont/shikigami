import { type Migration } from "../migrations";

export const migration: Migration = {
  name: "0005_rename_pending_to_blocked",
  sql: `
-- Update all fuda with status 'pending' to 'blocked'
UPDATE fuda SET status = 'blocked' WHERE status = 'pending';

-- Update any audit log entries that reference 'pending' status
UPDATE audit_log SET old_value = 'blocked' WHERE field = 'status' AND old_value = 'pending';
UPDATE audit_log SET new_value = 'blocked' WHERE field = 'status' AND new_value = 'pending';
  `.trim(),
};
