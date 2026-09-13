import { useEffect, useMemo, useRef, useState } from "react";
import { getLanguages, getMetrics, getTokenizers, tokeniseText } from "../../api/api";
import type { MetricsResponse, TokenizeResponse } from "../../utils/types";
import { METRIC_INFO } from "../../components/metricsdescription";
import { MetricInfo } from "../metricinfo";
import "./style.css";

// Circular progress ring for a single metric value (e.g. fertility, compression).
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
        <div className="metric-ring-wrap">
            <div className="metric-ring" style={{ "--ring-progress": `${percentage * 3.6}deg` } as React.CSSProperties}>
                <div className="metric-ring-inner">
                    <strong>{value.toFixed(2)}</strong>
                </div>
            </div>
            <span className="metric-ring-label">
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
        <div className="metric-bar-row">
            <div className="metric-bar-label">
                <span>
                    {label}
                    {description && <MetricInfo description={description} />}
                </span>
                <b>{value.toFixed(3)}{suffix}</b>
            </div>
            <div className="metric-bar-track"><span style={{ width: `${width}%` }} /></div>
        </div>
    );
}

// Searchable tokenizer input: shows a filtered dropdown of existing tokenizers,
// and lets the user type a brand-new Hugging Face tokenizer id to use on the fly.
function TokenizerPicker({
    value,
    options,
    loading,
    onChange,
    onAdd,
}: {
    value: string;
    options: string[];
    loading: boolean;
    onChange: (value: string) => void;
    onAdd: (value: string) => void;
}) {
    const [query, setQuery] = useState(value);
    const [prevValue, setPrevValue] = useState(value);
    const [open, setOpen] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // Adjust local query when the `value` prop changes, without an Effect
    // (see https://react.dev/learn/you-might-not-need-an-effect)
    if (value !== prevValue) {
        setPrevValue(value);
        setQuery(value);
    }

    const suggestions = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return options.slice(0, 8);
        return options.filter((item) => item.toLowerCase().includes(q)).slice(0, 8);
    }, [options, query]);

    const exactMatch = options.some((item) => item.toLowerCase() === query.trim().toLowerCase());
    const commit = (candidate = query) => {
        const clean = candidate.trim();
        if (!clean) return;
        const existing = options.find((item) => item.toLowerCase() === clean.toLowerCase());
        const finalValue = existing ?? clean;
        onChange(finalValue);
        if (!existing) onAdd(clean);
        setQuery(finalValue);
        setOpen(false);
    };

    return (
        <div className="tokenizer-picker">
            <div className={`picker-input-shell ${open ? "is-open" : ""}`}>
                <input
                    ref={inputRef}
                    value={query}
                    disabled={loading}
                    placeholder="Search or enter a Hugging Face tokenizer…"
                    onFocus={() => setOpen(true)}
                    onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") { e.preventDefault(); commit(); }
                        if (e.key === "Escape") setOpen(false);
                    }}
                    aria-label="Tokenizer"
                />
                <button className="enter-hint" type="button" onClick={() => commit()} title="Use this tokenizer">
                    ↵ Enter
                </button>
                <button className="picker-chevron" type="button" onClick={() => { setOpen((v) => !v); inputRef.current?.focus(); }} aria-label="Show tokenizers">
                    {open ? "⌃" : "⌄"}
                </button>
            </div>

            {open && !loading && (
                <div className="picker-menu">
                    {suggestions.map((item) => (
                        <button
                            type="button"
                            className={`picker-option ${item === value ? "selected" : ""}`}
                            key={item}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => commit(item)}
                        >
                            <span className="picker-option-text">
                                <b>{item}</b>
                                <small>{item.includes("/") ? "Hugging Face · pretrained tokenizer" : "Built-in / local tokenizer"}</small>
                            </span>
                            {item === value && <span className="check">✓</span>}
                        </button>
                    ))}
                    {!exactMatch && query.trim() && (
                        <button type="button" className="picker-add" onMouseDown={(e) => e.preventDefault()} onClick={() => commit()}>
                            <span className="add-plus">＋</span>
                            <span><b>Use "{query.trim()}"</b><small>Press Enter to load it dynamically</small></span>
                            <span className="add-badge">NEW</span>
                        </button>
                    )}
                    {suggestions.length === 0 && !query.trim() && <div className="picker-empty">No tokenizers are available yet.</div>}
                </div>
            )}
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

    // ─── Tokenize preview state (separate box, own tokenizer selection) ───
    const [previewTokenizer, setPreviewTokenizer] = useState<string>("");
    const [previewText, setPreviewText] = useState<string>("");
    const [previewResult, setPreviewResult] = useState<TokenizeResponse | null>(null);
    const [previewLoading, setPreviewLoading] = useState<boolean>(false);
    const [previewError, setPreviewError] = useState<string | null>(null);

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
                    setPreviewTokenizer(tokenizerList[0]);
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

    // ─── Tokenize preview: debounced call whenever tokenizer or text changes ───
    useEffect(() => {
        if (!previewTokenizer || previewText.trim().length === 0) {
            setPreviewResult(null);
            setPreviewError(null);
            return;
        }

        let cancelled = false;
        const timer = setTimeout(async () => {
            setPreviewLoading(true);
            setPreviewError(null);

            try {
                const result = await tokeniseText(previewTokenizer, previewText);
                if (!cancelled) setPreviewResult(result);
            } catch (err) {
                if (!cancelled) {
                    setPreviewError(err instanceof Error ? err.message : "Failed to tokenize text.");
                    setPreviewResult(null);
                }
            } finally {
                if (!cancelled) setPreviewLoading(false);
            }
        }, 400); // debounce so we don't hit the API on every keystroke

        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [previewTokenizer, previewText]);

    // Lets TokenizerPicker register a tokenizer id the user typed that wasn't in the original list.
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
                <p className="text-sm text-[color:var(--color-bad)]">
                    {error}
                </p>
            )}

            {/* ─── Tokenizer dropdown ─── */}
            <div className="flex flex-col gap-2 w-[320px]">
                <label htmlFor="tokenizer-select" className="section-label">
                    Tokenizer
                </label>

                {loading ? (
                    <div className="skeleton h-[44px] w-full" />
                ) : (
                    <TokenizerPicker
                        value={selectedTokenizer}
                        options={tokenizers}
                        loading={loading}
                        onChange={setSelectedTokenizer}
                        onAdd={addTokenizer}
                    />
                )}
            </div>

            {/* ─── Language row ─── */}
            <div className="flex flex-col gap-3">
                <p className="section-label">Languages</p>

                {loading ? (
                    <div className="flex flex-wrap gap-3">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <div key={i} className="skeleton h-[38px] w-[110px]" />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-wrap gap-3">
                        {Object.entries(languages).map(([code, name]) => {
                            const isActive = selectedLanguages.includes(code);
                            return (
                                <button
                                    key={code}
                                    type="button"
                                    onClick={() => toggleLanguage(code)}
                                    className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-[var(--radius-pill)] border transition-base cursor-pointer ${
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
                )}
            </div>

            {/* ─── Metrics ─── */}
            <div className="flex flex-col gap-3 mt-4">
                <p className="section-label">Metrics</p>

                {metricsError && (
                    <p className="text-sm text-[color:var(--color-bad)]">
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
                                                    <div className="rings">
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
                                                        <div className="mini-stat">
                                                            <b>{efficiency.token_count.toLocaleString()}</b>
                                                            <span>tokens<MetricInfo description={METRIC_INFO.token_count} /></span>
                                                            <em>premium {efficiency.token_premium.toFixed(2)}<MetricInfo description={METRIC_INFO.token_premium} /></em>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {linguistic && (
                                                <div className="flex flex-col gap-1">
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

            {/* ─── Tokenize Preview ─── */}
            <div className="card flex flex-col gap-5 p-6 mt-4 mb-14">
                <p className="section-label">Tokenize Preview</p>

                <div className="flex flex-col md:flex-row gap-4">
                    {/* Tokenizer dropdown for this box */}
                    <div className="flex flex-col gap-2 w-full md:w-[280px]">
                        <label htmlFor="preview-tokenizer-select" className="text-xs font-medium text-muted">
                            Tokenizer
                        </label>
                        <TokenizerPicker
                            value={previewTokenizer}
                            options={tokenizers}
                            loading={loading}
                            onChange={setPreviewTokenizer}
                            onAdd={addTokenizer}
                        />
                    </div>

                    {/* Text input */}
                    <div className="flex flex-col gap-2 w-full">
                        <label htmlFor="preview-text-input" className="text-xs font-medium text-muted">
                            Text
                        </label>
                        <textarea
                            id="preview-text-input"
                            value={previewText}
                            onChange={(e) => setPreviewText(e.target.value)}
                            placeholder="Type or paste text to see how the tokenizer splits it..."
                            rows={3}
                            className="bg-canvas text-charcoal text-sm px-4 py-3 rounded-[var(--radius-card)] border border-soft-border outline-none resize-none"
                        />
                    </div>
                </div>

                {previewError && (
                    <p className="text-sm text-[color:var(--color-bad)]">
                        {previewError}
                    </p>
                )}

                {/* Dark token preview panel */}
                <div className="card-dark p-5 min-h-[120px] flex flex-col gap-4">
                    {previewText.trim().length === 0 ? (
                        <p className="text-sm text-[color:var(--color-dark-muted)]">
                            Enter some text above to see its tokens.
                        </p>
                    ) : previewLoading ? (
                        <div className="flex flex-wrap gap-2">
                            {Array.from({ length: 10 }).map((_, i) => (
                                <div key={i} className="skeleton h-[28px] w-[60px]" />
                            ))}
                        </div>
                    ) : previewResult ? (
                        <>
                            <p className="text-xs font-mono uppercase tracking-wide text-[color:var(--color-dark-muted)]">
                                {previewResult.token_count} tokens · {previewResult.model_id}
                            </p>

                            <div className="flex flex-wrap gap-2">
                                {previewResult.tokens.map((token, i) => (
                                    <span
                                        key={i}
                                        title={`id: ${previewResult.token_ids[i]}`}
                                        className={`font-mono text-xs px-2 py-1 rounded-md border border-[color:var(--color-dark-surface)] ${
                                            i % 2 === 0
                                                ? "bg-[color:var(--color-dark-surface)] text-panel"
                                                : "bg-transparent text-panel"
                                        }`}
                                    >
                                        {token}
                                    </span>
                                ))}
                            </div>
                        </>
                    ) : null}
                </div>
            </div>
        </section>
    );
}