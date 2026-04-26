import { CheckerActivityFeedView } from "@/components/checker/CheckerActivityFeedView";
import {
  buildCheckerActivityItems,
  collectBoxIdsFromActivityLogs,
} from "@/components/checker/checker-activity-items";
import {
  CHECKER_ACTIVITY_FEED_HOURS,
  CHECKER_ACTIVITY_FEED_MAX,
  listCheckerActivityFeed,
} from "@/lib/queries/audit-logs";
import { getPartNumbersByBoxIds } from "@/lib/queries/boxes";
import { createClient } from "@/lib/supabase/server";

export default async function CheckerActivityPage() {
  const supabase = await createClient();

  const { data: logs, error: logsError } = await listCheckerActivityFeed(
    supabase,
    {
      hoursBack: CHECKER_ACTIVITY_FEED_HOURS,
      maxItems: CHECKER_ACTIVITY_FEED_MAX,
    },
  );

  const boxIds = collectBoxIdsFromActivityLogs(logs);
  const { data: partByBoxId, error: partError } = await getPartNumbersByBoxIds(
    supabase,
    boxIds,
  );
  const partMap = partError ? {} : partByBoxId;
  const items = logsError
    ? []
    : buildCheckerActivityItems(logs, partMap);
  const loadError = !!logsError;

  return (
    <div className="ds-page-operational">
      <header className="border-b border-[var(--border-default)] pb-6">
        <p className="ds-section-label mb-1">Checker · inbound</p>
        <h1 className="ds-h1">Aktivitas box</h1>
        <p className="ds-lead">
          Ringkasan operasional proses box: scan tiba, QC sesuai, dan QC bermasalah
          (jendela {CHECKER_ACTIVITY_FEED_HOURS} jam, maks. {CHECKER_ACTIVITY_FEED_MAX}{" "}
          entri terbaru). Bukan laporan analitik — hanya feed agar cepat dicek di
          lantai.
        </p>
      </header>

      <section
        className="mt-6 rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--surface)] px-4 py-3 shadow-[var(--shadow-sm)] sm:px-5 sm:py-4"
        aria-labelledby="activity-feed-heading"
      >
        <h2
          id="activity-feed-heading"
          className="mb-3 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]"
        >
          Ringkasan & feed
        </h2>
        <CheckerActivityFeedView
          items={items}
          loadError={loadError}
          hoursBack={CHECKER_ACTIVITY_FEED_HOURS}
          maxItems={CHECKER_ACTIVITY_FEED_MAX}
        />
      </section>
    </div>
  );
}
