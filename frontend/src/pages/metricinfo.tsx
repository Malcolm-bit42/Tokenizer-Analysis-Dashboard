import { useState } from "react";
import "./metricinfo.css";

/**
 * Small "ⓘ" icon that sits next to a metric label. Hovering it opens a
 * popover with a plain-language description; clicking it toggles the
 * popover (so it also works on touch devices with no hover); the popover
 * has its own close (×) button.
 *
 * Usage:
 *   <span>Fertility<MetricInfo description={METRIC_INFO.fertility} /></span>
 */
export function MetricInfo({ description }: { description: string }) {
    const [open, setOpen] = useState(false);

    return (
        <span className="metric-info">
            <button
                type="button"
                className="metric-info-icon"
                onMouseEnter={() => setOpen(true)}
                onClick={(e) => {
                    e.stopPropagation();
                    setOpen((v) => !v);
                }}
                aria-label="More about this metric"
            >
                ⓘ
            </button>

            {open && (
                <div className="metric-info-popover" onMouseLeave={() => setOpen(false)}>
                    <button
                        type="button"
                        className="metric-info-close"
                        onClick={() => setOpen(false)}
                        aria-label="Close"
                    >
                        ×
                    </button>
                    <p>{description}</p>
                </div>
            )}
        </span>
    );
}

export default MetricInfo;