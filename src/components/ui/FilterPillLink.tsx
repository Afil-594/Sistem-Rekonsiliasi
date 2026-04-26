import Link from "next/link";
import type { ComponentProps } from "react";

type Props = Omit<ComponentProps<typeof Link>, "className"> & {
  active: boolean;
  className?: string;
};

/**
 * Filter / tab link using shared `ds-pill` styles.
 */
export function FilterPillLink({ active, className = "", children, ...rest }: Props) {
  return (
    <Link
      className={`${active ? "ds-pill ds-pill-active" : "ds-pill ds-pill-inactive"} ${className}`.trim()}
      {...rest}
    >
      {children}
    </Link>
  );
}
