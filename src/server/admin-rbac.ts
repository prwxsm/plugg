/** Centralized Stage B authorization.
 * Never fall back to users.is_admin or an email address.
 */
import type { TransactionSql } from "postgres";
export type AdminRole = "super_admin" | "admin" | "moderator";
export type AdminPermission =
  | "review.read"
  | "review.write"
  | "catalog.read"
  | "analytics.read"
  | "artists.write"
  | "genres.write"
  | "schedule.write"
  | "content.takedown"
  | "processing.retry"
  | "users.read"
  | "staff.manage"
  | "audit.read"
  | "settings.write";
const reviewer: readonly AdminPermission[] = ["review.read", "review.write"];
const operator: readonly AdminPermission[] = [
  ...reviewer,
  "catalog.read",
  "analytics.read",
  "artists.write",
  "genres.write",
  "schedule.write",
  "content.takedown",
  "processing.retry",
];
const permissions: Record<AdminRole, readonly AdminPermission[]> = {
  moderator: reviewer,
  admin: operator,
  super_admin: [...operator, "users.read", "staff.manage", "audit.read", "settings.write"],
};
export function hasPermission(role: unknown, permission: AdminPermission): boolean {
  return (
    typeof role === "string" &&
    Object.hasOwn(permissions, role) &&
    permissions[role as AdminRole].includes(permission)
  );
}
export interface AdminPrincipal {
  id: string;
  name: string;
  role: AdminRole;
}
export class AdminAuthorizationError extends Error {
  readonly status: 401 | 403;
  constructor(status: 401 | 403) {
    super(status === 401 ? "Authentication required" : "Administrative permission required");
    this.status = status;
  }
}
export async function requireAdminSession(
  tx: TransactionSql,
  sessionId: string | undefined,
): Promise<AdminPrincipal> {
  if (!sessionId) throw new AdminAuthorizationError(401);
  const [user] = await tx<{ id: string; name: string; role: AdminRole | null }[]>`
 SELECT u.id,u.name,m.role FROM sessions s JOIN users u ON u.id=s.user_id
 LEFT JOIN admin_memberships m ON m.user_id=u.id AND m.active
 WHERE s.id=${sessionId} AND s.expires_at>now() LIMIT 1`;
  if (!user) throw new AdminAuthorizationError(401);
  if (!user.role || !Object.hasOwn(permissions, user.role)) throw new AdminAuthorizationError(403);
  return { id: user.id, name: user.name, role: user.role };
}
export async function requirePermission(
  tx: TransactionSql,
  sessionId: string | undefined,
  permission: AdminPermission,
) {
  const principal = await requireAdminSession(tx, sessionId);
  if (!hasPermission(principal.role, permission)) throw new AdminAuthorizationError(403);
  return principal;
}
export async function requireRole(
  tx: TransactionSql,
  sessionId: string | undefined,
  role: AdminRole,
) {
  const principal = await requireAdminSession(tx, sessionId);
  if (principal.role !== role) throw new AdminAuthorizationError(403);
  return principal;
}
