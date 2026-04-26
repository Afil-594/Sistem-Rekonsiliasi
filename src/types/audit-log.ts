/** Matches `public.audit_logs` in docs/database/schema.sql */
export type AuditLog = {
  id: string;
  user_id: string | null;
  action: string;
  target_table: string | null;
  payload: Record<string, unknown> | null;
  created_at: string | null;
};

export type AuditLogWithUser = AuditLog & {
  profiles: { full_name: string | null } | null;
};
