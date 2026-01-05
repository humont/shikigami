import { type Migration } from "../migrations";
import { migration as init } from "./0001_init";

// All migrations in order - add new migrations here
export const allMigrations: Migration[] = [
  init,
];
