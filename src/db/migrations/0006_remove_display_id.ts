import { type Migration } from "../migrations";

export const migration: Migration = {
  name: "0006_remove_display_id",
  sql: `
-- Remove the display_id column from fuda table
-- SQLite 3.35.0+ supports ALTER TABLE DROP COLUMN
ALTER TABLE fuda DROP COLUMN display_id;
  `.trim(),
};
