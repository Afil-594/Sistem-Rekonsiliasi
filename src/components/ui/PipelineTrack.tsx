type Step = { id: string; label: string };

type Props = {
  steps: Step[];
  activeIndex: number;
  "aria-label"?: string;
  className?: string;
};

/**
 * Horizontal pipeline / stage indicator (e.g. shipment lifecycle).
 */
export function PipelineTrack({
  steps,
  activeIndex,
  "aria-label": ariaLabel,
  className = "",
}: Props) {
  return (
    <ol
      className={`ds-pipeline m-0 list-none p-0 ${className}`.trim()}
      aria-label={ariaLabel}
    >
      {steps.map((s, i) => {
        const isActive = i === activeIndex;
        const isComplete = i < activeIndex;
        return (
          <li key={s.id} className="flex items-center">
            <span
              className={
                isActive
                  ? "ds-pipeline__step ds-pipeline__step--active"
                  : isComplete
                    ? "ds-pipeline__step ds-pipeline__step--complete"
                    : "ds-pipeline__step"
              }
            >
              {s.label}
            </span>
            {i < steps.length - 1 ? (
              <span className="ds-pipeline__arrow" aria-hidden>
                →
              </span>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
