import type { ReactNode } from "react";

type Props = {
  title: string;
  lead?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
};

/**
 * Primary dashboard block: title, optional lead, optional action, card body.
 */
export function SectionCard({ title, lead, action, children, className = "" }: Props) {
  return (
    <section className={`ds-section-card ${className}`.trim()}>
      <div className="ds-section-card__header">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="ds-h2">{title}</h2>
            {lead ? <p className="ds-lead mt-1 max-w-3xl">{lead}</p> : null}
          </div>
          {action ? <div className="shrink-0 pt-0.5">{action}</div> : null}
        </div>
      </div>
      <div className="ds-section-card__body">{children}</div>
    </section>
  );
}
