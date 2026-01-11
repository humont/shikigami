export const FudaStatus = {
  BLOCKED: "blocked",
  READY: "ready",
  IN_PROGRESS: "in_progress",
  IN_REVIEW: "in_review",
  FAILED: "failed",
  DONE: "done",
} as const;

export type FudaStatus = (typeof FudaStatus)[keyof typeof FudaStatus];

export const DependencyType = {
  BLOCKS: "blocks",
  PARENT_CHILD: "parent-child",
  RELATED: "related",
  DISCOVERED_FROM: "discovered-from",
} as const;

export type DependencyType = (typeof DependencyType)[keyof typeof DependencyType];

export const SpiritType = {
  PRD: "prd",
  TASK: "task",
  TEST: "test",
  CODE: "code",
  REVIEW: "review",
} as const;

export type SpiritType = (typeof SpiritType)[keyof typeof SpiritType];

export interface Fuda {
  id: string;
  prdId: string | null;
  title: string;
  description: string;
  status: FudaStatus;
  spiritType: SpiritType;
  assignedSpiritId: string | null;
  outputCommitHash: string | null;
  retryCount: number;
  failureContext: string | null;
  parentFudaId: string | null;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  deletedBy: string | null;
  deleteReason: string | null;
}

export interface FudaDependency {
  fudaId: string;
  dependsOnId: string;
  type: DependencyType;
}

export interface CreateFudaInput {
  title: string;
  description: string;
  spiritType?: SpiritType;
  priority?: number;
  prdId?: string;
  parentFudaId?: string;
}

export interface DeleteFudaOptions {
  deletedBy?: string;
  reason?: string;
}

export function isBlockingDependency(type: DependencyType): boolean {
  return type === DependencyType.BLOCKS || type === DependencyType.PARENT_CHILD;
}
