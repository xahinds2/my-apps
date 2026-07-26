import { createHash, randomBytes } from 'crypto';
import ManifestItem from '@/features/manifest/models/ManifestItem';
import BudgetPlan from '@/features/finance/models/BudgetPlan';
import UserInsurance from '@/features/finance/models/UserInsurance';
import UserMilestones from '@/features/finance/models/UserMilestones';
import type { ShareResourceType } from '@/features/common/models/ShareAccess';

export const SHARE_TOKEN_BYTES = 24;

function toPlainJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function pruneSharedData<T extends Record<string, unknown>>(value: T): Omit<T, 'userId' | '__v'> {
  const result = { ...value };
  delete (result as Record<string, unknown>).userId;
  delete (result as Record<string, unknown>).__v;
  return result as Omit<T, 'userId' | '__v'>;
}

export function createShareToken(): string {
  return randomBytes(SHARE_TOKEN_BYTES).toString('base64url');
}

export function hashShareToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function parseExpiry(value: unknown): Date | null {
  if (typeof value !== 'string' || !value.trim()) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

export function normalizeAllowedUserIds(value: unknown, ownerUserId: string): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<string>();
  for (const item of value) {
    if (typeof item !== 'string') continue;
    const trimmed = item.trim();
    if (!trimmed || trimmed === ownerUserId) continue;
    seen.add(trimmed);
  }

  return [...seen];
}

export function isShareExpired(expiresAt?: Date | null): boolean {
  return Boolean(expiresAt && expiresAt.getTime() <= Date.now());
}

export function buildPublicShareUrl(req: Request, token: string): string {
  const url = new URL(req.url);
  return `${url.origin}/api/shares/public/${token}`;
}

export async function getShareableResource(
  ownerUserId: string,
  resourceType: ShareResourceType,
  resourceId: string
): Promise<Record<string, unknown> | null> {
  if (resourceType === 'manifest_collection') {
    const docs = await ManifestItem.find({ userId: ownerUserId }).sort({ createdAt: -1 }).lean();
    return {
      resourceId,
      items: docs.map(doc => pruneSharedData(toPlainJson(doc as Record<string, unknown>))),
    };
  }

  if (resourceType === 'manifest_item') {
    const doc = await ManifestItem.findOne({ _id: resourceId, userId: ownerUserId }).lean();
    return doc ? pruneSharedData(toPlainJson(doc as Record<string, unknown>)) : null;
  }

  if (resourceType === 'budget_plan') {
    const doc = await BudgetPlan.findOne({ _id: resourceId, userId: ownerUserId }).lean();
    return doc ? pruneSharedData(toPlainJson(doc as Record<string, unknown>)) : null;
  }

  if (resourceType === 'user_insurance') {
    const doc = await UserInsurance.findOne({ _id: resourceId, userId: ownerUserId }).lean();
    return doc ? pruneSharedData(toPlainJson(doc as unknown as Record<string, unknown>)) : null;
  }

  if (resourceType === 'user_milestones') {
    const doc = await UserMilestones.findOne({ _id: resourceId, userId: ownerUserId }).lean();
    return doc ? pruneSharedData(toPlainJson(doc as unknown as Record<string, unknown>)) : null;
  }

  return null;
}
