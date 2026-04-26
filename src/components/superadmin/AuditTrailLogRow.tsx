import type { AuditLogWithUser } from "@/types/audit-log";
import {
  buildAuditLogSummary,
  formatAuditPayloadForDisplay,
  prettyJsonString,
} from "@/lib/utils/audit-log-display";

type Props = {
  log: AuditLogWithUser;
  formatActionLabel: (action: string) => string;
  formatTimestamp: (iso: string | null) => string;
  userCellLabel: (log: AuditLogWithUser) => string;
};

export function AuditTrailLogRow({
  log,
  formatActionLabel,
  formatTimestamp,
  userCellLabel,
}: Props) {
  const payload = log.payload;
  const summary = buildAuditLogSummary(log.action, payload);
  const { priorityEntries, otherEntries } = formatAuditPayloadForDisplay(payload);
  const hasMore = otherEntries.length > 0;
  const jsonBlock = prettyJsonString(payload);

  return (
    <tr className="ds-trow align-top">
      <td className="w-[1%] px-3 py-3.5 pl-4">
        <div className="inline-flex min-w-0 max-w-full flex-col gap-0.5">
          <time
            className="whitespace-nowrap font-mono text-[0.7rem] text-[var(--text-primary)]"
            dateTime={log.created_at ?? undefined}
            title={log.created_at ?? undefined}
          >
            {formatTimestamp(log.created_at)}
          </time>
        </div>
      </td>
      <td className="max-w-[min(28rem,40vw)] px-3 py-3.5 text-sm leading-snug text-[var(--text-primary)]">
        {summary}
      </td>
      <td className="w-[1%] px-3 py-3.5">
        <span
          className="ds-badge ds-badge-accent max-w-full font-medium capitalize"
          title={log.action}
        >
          {formatActionLabel(log.action)}
        </span>
      </td>
      <td className="px-3 py-3.5">
        <span
          className="inline-block max-w-[12rem] truncate rounded border border-[var(--border-default)] bg-[var(--surface-elevated)] px-1.5 py-0.5 font-mono text-[0.7rem] text-[var(--text-primary)]"
          title={log.target_table ?? undefined}
        >
          {log.target_table ?? "—"}
        </span>
      </td>
      <td className="px-3 py-3.5 text-sm font-medium text-[var(--text-primary)]">
        {userCellLabel(log)}
      </td>
      <td className="min-w-0 max-w-md px-3 py-3.5 pr-4 text-xs">
        {!payload || Object.keys(payload).length === 0 ? (
          <span className="text-[var(--text-muted)]">—</span>
        ) : (
          <div className="flex flex-col gap-2">
            {priorityEntries.length > 0 && (
              <dl className="flex flex-col gap-1 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--section-bg)] p-2.5">
                {priorityEntries.map(([key, value]) => (
                  <div
                    key={key}
                    className="grid grid-cols-[minmax(0,auto),1fr] gap-x-2 gap-y-0.5 text-left"
                  >
                    <dt className="shrink-0 text-[0.65rem] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                      {key}
                    </dt>
                    <dd className="min-w-0 break-all font-mono text-[0.7rem] text-[var(--text-primary)]">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
            {hasMore && (
              <details className="group rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface)]">
                <summary className="cursor-pointer select-none px-2.5 py-1.5 text-xs font-medium text-[var(--navy)] transition-colors group-open:text-[var(--navy-hover)]">
                  {otherEntries.length} field lainnya + JSON mentah
                </summary>
                <div className="border-t border-[var(--border-default)] p-2.5">
                  {otherEntries.length > 0 && (
                    <dl className="mb-2 flex flex-col gap-0.5 text-[11px]">
                      {otherEntries.map(([key, value]) => (
                        <div key={key} className="flex flex-wrap gap-x-2">
                          <dt className="shrink-0 text-[var(--text-muted)]">{key}</dt>
                          <dd className="min-w-0 break-all font-mono text-[var(--text-primary)]">
                            {value}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  )}
                  <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-all rounded border border-[var(--border-default)] bg-[var(--surface-elevated)] p-2 text-[10px] leading-tight text-[var(--text-primary)]">
                    {jsonBlock}
                  </pre>
                </div>
              </details>
            )}
            {!hasMore && priorityEntries.length > 0 && (
              <details className="text-[11px]">
                <summary className="cursor-pointer select-none text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]">
                  JSON mentah
                </summary>
                <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap break-all rounded border border-[var(--border-default)] bg-[var(--section-bg)] p-2 text-[10px] text-[var(--text-primary)]">
                  {jsonBlock}
                </pre>
              </details>
            )}
          </div>
        )}
      </td>
    </tr>
  );
}
