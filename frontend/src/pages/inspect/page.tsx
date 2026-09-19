import { useEffect, useState } from "react";
import { getLanguages, getMetrics, getTokenizers } from "../../api/api";
import type { MetricsResponse } from "../../utils/types";
import { METRIC_INFO } from "../../components/metricsdescription";
import { MetricInfo } from "../metricinfo";
import { DropDown } from "../../components/dropdown";
import { LiveWindow } from "./live_window";

// Circular progress ring for a single metric value (e.g. fertility, compression).
// Pure Tailwind + one inline conic-gradient (the only part that has to be dynamic per value).
function MetricRing({
    value,
    label,
    description,
    max = 1,
}: {
    value: number;
    label: string;
    description?: string;
    max?: number;
}) {
    const percentage = Math.max(0, Math.min(100, (value / max) * 100));
    return (
        <div className="flex flex-col items-center gap-2">
            <div
                className="relative w-16 h-16 rounded-full"
                style={{ background: `conic-gradient(var(--color-good) ${percentage}%, var(--color-soft-border) 0)` }}
            >
                <div className="absolute inset-1 bg-panel rounded-full flex items-center justify-center">
                    <strong className="text-[11px] font-bold text-charcoal">{value.toFixed(2)}</strong>
                </div>
            </div>
            <span className="text-[11px] text-muted flex items-center">
                {label}
                {description && <MetricInfo description={description} />}
            </span>
        </div>
    );
}

// Horizontal progress bar for a single metric value (e.g. precision, recall, F1).
function MetricBar({
    label,
    value,
    description,
    max = 1,
    suffix = "",
}: {
    label: string;
    value: number;
    description?: string;
    max?: number;
    suffix?: string;
}) {
    const width = Math.max(4, Math.min(100, (value / max) * 100));
    return (
        <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs">
                <span className="text-muted flex items-center">
                    {label}
                    {description && <MetricInfo description={description} />}
                </span>
                <b className="text-charcoal">{value.toFixed(3)}{suffix}</b>
            </div>
            <div className="w-full h-1.5 bg-soft-border rounded-pill overflow-hidden">
                <span className="block h-full bg-charcoal rounded-pill" style={{ width: `${width}%` }} />
            </div>
        </div>
    );
}


function PremiumGauge({
    value,
    description,
}: {
    value: number;
    description?: string;
}) {
    const CAP = 3;
    const width = Math.max(0, Math.min(100, ((value - 1) / (CAP - 1)) * 100));
    const color =
        value <= 1.2 ? "var(--color-good)" : value <= 2 ? "var(--color-warn)" : "var(--color-bad)";

    return (
        <div className="flex flex-col gap-1">
            <span className="text-[11px] text-muted flex items-center">
                Premium
                {description && <MetricInfo description={description} />}
            </span>
            <div className="flex items-center gap-2">
                <div className="w-16 h-1.5 bg-soft-border rounded-pill overflow-hidden">
                    <span
                        className="block h-full rounded-pill transition-base"
                        style={{ width: `${width}%`, backgroundColor: color }}
                    />
                </div>
                <b className="text-xs font-bold" style={{ color }}>
                    {value.toFixed(2)}×
                </b>
            </div>
        </div>
    );
}

export default function Inpsect() {
    // ─── Tokenizer dropdown state ───
    const [tokenizers, setTokenizers] = useState<string[]>([]);
    const [selectedTokenizer, setSelectedTokenizer] = useState<string>("");

    // ─── Language row state ───
    const [languages, setLanguages] = useState<Record<string, string>>({});
    const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);

    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // ─── Metrics state ───
    const [metrics, setMetrics] = useState<MetricsResponse | null>(null);
    const [metricsLoading, setMetricsLoading] = useState<boolean>(false);
    const [metricsError, setMetricsError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function loadOptions() {
            setLoading(true);
            setError(null);

            try {
                const [tokenizerList, languageMap] = await Promise.all([
                    getTokenizers(),
                    getLanguages(),
                ]);

                if (cancelled) return;

                setTokenizers(tokenizerList);
                setLanguages(languageMap);

                // Default to the first tokenizer once options arrive
                if (tokenizerList.length > 0) {
                    setSelectedTokenizer(tokenizerList[0]);
                }

                // Default to all languages selected
                setSelectedLanguages(Object.keys(languageMap));
            } catch (err) {
                if (!cancelled) {
                    setError(err instanceof Error ? err.message : "Failed to load options.");
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        loadOptions();

        return () => {
            cancelled = true;
        };
    }, []);

    // ─── Fetch metrics whenever tokenizer or selected languages change ───
    useEffect(() => {
        if (!selectedTokenizer || selectedLanguages.length === 0) {
            setMetrics(null);
            return;
        }

        let cancelled = false;

        async function loadMetrics() {
            setMetricsLoading(true);
            setMetricsError(null);

            try {
                const languageNames = selectedLanguages
                    .map((code) => languages[code])
                    .filter((name): name is string => Boolean(name));

                const result = await getMetrics(selectedTokenizer, languageNames, "all");
                if (!cancelled) setMetrics(result);
            } catch (err) {
                if (!cancelled) {
                    setMetricsError(err instanceof Error ? err.message : "Failed to load metrics.");
                    setMetrics(null);
                }
            } finally {
                if (!cancelled) setMetricsLoading(false);
            }
        }

        loadMetrics();

        return () => {
            cancelled = true;
        };
    }, [selectedTokenizer, selectedLanguages, languages]);

    // Lets DropDown register a tokenizer id the user typed that wasn't in the original list.
    const addTokenizer = (value: string) => {
        setTokenizers((prev) =>
            prev.some((x) => x.toLowerCase() === value.toLowerCase()) ? prev : [...prev, value]
        );
    };

    const toggleLanguage = (code: string) => {
        setSelectedLanguages((prev) =>
            prev.includes(code)
                ? prev.filter((lang) => lang !== code)
                : [...prev, code]
        );
    };

    return (
        <section className="flex flex-col gap-6 px-[4rem] mt-14">
            {error && (
                <p className="text-sm text-bad">
                    {error}
                </p>
            )}

            {/* ─── Tokenizer dropdown ─── */}
            <div className="flex flex-col gap-2 w-[320px]">
                {loading ? (
                    <div className="skeleton h-[44px] w-full" />
                ) : (
                    <DropDown
                        options={tokenizers}
                        placeholder="Tokenizer"
                        action={(e: any) => {
                            setSelectedTokenizer(e.target.value);
                            addTokenizer(e.target.value);
                        }}
                    />
                )}
            </div>

            {/* ─── Language row ─── */}

            <div className="flex flex-col gap-3">
                <p className="section-label">Languages</p>

                {loading ? (
                    <div className="flex flex-nowrap gap-3">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <div key={i} className="skeleton h-[38px] w-[110px]" />
                        ))}
                    </div>
                ) : (
                    <div className="w-fit border border-soft-border rounded-xl bg-panel p-3">
                        <div className="flex flex-nowrap gap-3">
                            {Object.entries(languages).map(([code, name]) => {
                                const isActive = selectedLanguages.includes(code);

                                return (
                                    <button
                                        key={code}
                                        type="button"
                                        onClick={() => toggleLanguage(code)}
                                        className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-pill border transition-base cursor-pointer ${
                                            isActive
                                                ? "bg-charcoal text-panel border-charcoal"
                                                : "bg-panel text-muted border-soft-border hover:border-strong-border"
                                        }`}
                                    >
                                        {name}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* ─── Metrics ─── */}
            <div className="flex flex-col gap-3 mt-4">
                <p className="section-label">Metrics</p>

                {metricsError && (
                    <p className="text-sm text-bad">
                        {metricsError}
                    </p>
                )}

                {!selectedTokenizer || selectedLanguages.length === 0 ? (
                    <p className="text-sm text-muted">
                        Select a tokenizer and at least one language to see metrics.
                    </p>
                ) : metricsLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {selectedLanguages.map((code) => (
                            <div key={code} className="skeleton h-[190px] w-full" />
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {selectedLanguages.map((code) => {
                            const displayName = languages[code];
                            const efficiency = displayName ? metrics?.efficiency?.[displayName] : undefined;
                            const linguistic = displayName ? metrics?.linguistic?.[displayName] : undefined;

                            return (
                                <div key={code} className="card flex flex-col gap-4 p-5">
                                    <p className="text-sm font-bold text-charcoal">
                                        {languages[code] ?? code}
                                    </p>

                                    {!efficiency && !linguistic ? (
                                        <p className="text-xs text-muted">
                                            No metrics available for this language.
                                        </p>
                                    ) : (
                                        <div className="flex flex-col gap-3">
                                            {efficiency && (
                                                <div className="flex flex-col gap-2">
                                                    <p className="text-[11px] font-mono uppercase tracking-wide text-muted">
                                                        Efficiency
                                                    </p>
                                                    <div className="flex items-start gap-4">
                                                        <MetricRing
                                                            value={efficiency.fertility}
                                                            label="fertility"
                                                            description={METRIC_INFO.fertility}
                                                            max={Math.max(1, efficiency.fertility)}
                                                        />
                                                        <MetricRing
                                                            value={efficiency.compression}
                                                            label="compression"
                                                            description={METRIC_INFO.compression}
                                                            max={Math.max(1, efficiency.compression)}
                                                        />
                                                        <div className="flex flex-col gap-3">
                                                            <div className="flex flex-col leading-none">
                                                                <b className="text-2xl font-bold text-charcoal">
                                                                    {efficiency.token_count.toLocaleString()}
                                                                </b>
                                                                <span className="text-muted text-xs flex items-center mt-1">
                                                                    tokens<MetricInfo description={METRIC_INFO.token_count} />
                                                                </span>
                                                            </div>
                                                            <PremiumGauge
                                                                value={efficiency.token_premium}
                                                                description={METRIC_INFO.token_premium}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {linguistic && (
                                                <div className="flex flex-col gap-2">
                                                    <p className="text-[11px] font-mono uppercase tracking-wide text-muted">
                                                        Linguistic
                                                    </p>
                                                    <MetricBar label="Precision" value={linguistic.precision} description={METRIC_INFO.precision} />
                                                    <MetricBar label="Recall" value={linguistic.recall} description={METRIC_INFO.recall} />
                                                    <MetricBar label="F1 score" value={linguistic.f1} description={METRIC_INFO.f1} />
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ─── Live tokenization ─── */}
            <LiveWindow
                tokenizers={tokenizers}
                loading={loading}
                languages={languages}
                onAddTokenizer={addTokenizer}
            />
        </section>
    );
}