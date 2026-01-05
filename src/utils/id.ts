import { randomBytes } from "crypto";

const ID_PREFIX = "sk-";
const MIN_LENGTH = 4;
const MAX_LENGTH = 6;

function generateBase(): string {
  return randomBytes(8)
    .toString("base64")
    .replace(/[+/=]/g, "")
    .toLowerCase()
    .slice(0, MAX_LENGTH);
}

export function generateId(existingIds?: Set<string>): string {
  let length = MIN_LENGTH;

  while (length <= MAX_LENGTH) {
    const base = generateBase().slice(0, length);
    const id = `${ID_PREFIX}${base}`;

    if (!existingIds || !existingIds.has(id)) {
      return id;
    }

    // Try a few more times at this length before extending
    for (let attempt = 0; attempt < 10; attempt++) {
      const retryBase = generateBase().slice(0, length);
      const retryId = `${ID_PREFIX}${retryBase}`;
      if (!existingIds.has(retryId)) {
        return retryId;
      }
    }

    length++;
  }

  // Fallback: use full length with more entropy
  const fullBase = randomBytes(16)
    .toString("base64")
    .replace(/[+/=]/g, "")
    .toLowerCase()
    .slice(0, MAX_LENGTH);
  return `${ID_PREFIX}${fullBase}`;
}
