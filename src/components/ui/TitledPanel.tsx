import type { ReactNode } from "react";

type Props = {
  title: string;
  children: ReactNode;
  className?: string;
};

/**
 * Small titled region inside a section (e.g. chart column, breakdown list).
 */
export function TitledPanel({ title, children, className = "" }: Props) {
  return (
    <div className={`ds-titled-panel ${className}`.trim()}>
      <h3 className="ds-titled-panel__title">{title}</h3>
      <div className="ds-titled-panel__body">{children}</div>
    </div>
  );
}
