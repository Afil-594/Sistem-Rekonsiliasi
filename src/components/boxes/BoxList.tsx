import { StatusBadge } from "@/components/ui/StatusBadge";
import type { Box } from "@/types/box";

type Props = {
  boxes: Box[];
};

export function BoxList({ boxes }: Props) {
  if (boxes.length === 0) {
    return <p className="text-sm text-slate-600 dark:text-slate-400">Belum ada box pada shipment ini.</p>;
  }

  return (
    <div className="ds-table-wrap">
      <table className="w-full min-w-[36rem] border-collapse text-sm">
        <thead>
          <tr className="ds-thead">
            <th className="ds-tcell border-0 py-2.5 pl-3">Kode box</th>
            <th className="ds-tcell border-0">Part</th>
            <th className="ds-tcell border-0 text-right">Qty</th>
            <th className="ds-tcell border-0">Lot</th>
            <th className="ds-tcell border-0 pr-3">Status</th>
          </tr>
        </thead>
        <tbody>
          {boxes.map((row) => (
            <tr key={row.id} className="ds-trow">
              <td className="ds-tcell pl-3 font-mono text-xs sm:text-sm">{row.box_code}</td>
              <td className="ds-tcell font-mono text-xs sm:text-sm">{row.part_number}</td>
              <td className="ds-tcell text-right tabular-nums">{row.qty_per_box}</td>
              <td className="ds-tcell text-slate-700 dark:text-slate-300">{row.lot_number}</td>
              <td className="ds-tcell pr-3">
                {row.status ? <StatusBadge status={row.status} /> : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
