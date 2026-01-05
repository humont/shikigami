export interface GenerateDisplayIdOptions {
  prdId?: string;
  parentDisplayId?: string;
  siblingCount: number;
}

export function generateDisplayId(options: GenerateDisplayIdOptions): string | null {
  const { prdId, parentDisplayId, siblingCount } = options;

  if (!prdId) {
    return null;
  }

  const nextNumber = siblingCount + 1;

  if (parentDisplayId) {
    return `${parentDisplayId}.${nextNumber}`;
  }

  return `${prdId}.${nextNumber}`;
}
