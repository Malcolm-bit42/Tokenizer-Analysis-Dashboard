import { useEffect, useState } from "react";
import { getLanguages, getMetrics, getTokenizers } from "../../api/api";
import type { MetricsResponse } from "../../utils/types";

export default function Inpsect() {
    // ─── Tokenizer dropdown state ───
    const [tokenizers, setTokenizers] = useState<string[]>([]);
    const [selectedTokenizer, setSelectedTokenizer] = useState<string>("");

    // ─── Language row state ───
    const [languages, setLanguages] = useState<Record<string, string>>({});
    const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);

    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    
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
    
    useEffect(() => {
        if (!selectedTokenizer || selectedLanguages.length == 0){
            setMetrics(null);
            return;
        }
        let cancelled = false;
        async function  loadMetrics(){
            setMetricsLoading(true);
            setMetricsError(null);

            try {
                const languageNames = selectedLanguages
                    .map((code) => languages[code])
                    .filter((name): name is string => Boolean(name));
                const result = await getMetrics(selectedTokenizer, languageNames, "all")
                if (!cancelled) setMetrics(result); 
            } catch (err) {
                if (!cancelled){
                    setMetricsError(err instanceof Error ? err.message : "Failed to load  Metrics.");
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
                    <select
                        id="tokenizer-select"
                        value={selectedTokenizer}
                        onChange={(e) => setSelectedTokenizer(e.target.value)}
                        className="card bg-panel text-charcoal text-sm font-medium px-4 py-3 rounded-[var(--radius-card)] cursor-pointer outline-none appearance-none"
                        disabled={tokenizers.length === 0}
                    >
                        {tokenizers.length === 0 && (
                            <option value="">No tokenizers available</option>
                        )}
                        {tokenizers.map((model_id) => (
                            <option key={model_id} value={model_id}>
                                {model_id}
                            </option>
                        ))}
                    </select>
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
                                                <div className="flex flex-col gap-1">
                                                    <p className="text-[11px] font-mono uppercase tracking-wide text-muted">
                                                        Efficiency
                                                    </p>
                                                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-charcoal">
                                                        <span className="text-muted">Token count</span>
                                                        <span className="text-right font-mono">{efficiency.token_count}</span>

                                                        <span className="text-muted">Fertility</span>
                                                        <span className="text-right font-mono">{efficiency.fertility.toFixed(3)}</span>

                                                        <span className="text-muted">Compression</span>
                                                        <span className="text-right font-mono">{efficiency.compression.toFixed(3)}</span>

                                                        <span className="text-muted">Token premium</span>
                                                        <span className="text-right font-mono">{efficiency.token_premium.toFixed(3)}</span>
                                                    </div>
                                                </div>
                                            )}

                                            {linguistic && (
                                                <div className="flex flex-col gap-1">
                                                    <p className="text-[11px] font-mono uppercase tracking-wide text-muted">
                                                        Linguistic
                                                    </p>
                                                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-charcoal">
                                                        <span className="text-muted">Precision</span>
                                                        <span className="text-right font-mono">{linguistic.precision.toFixed(3)}</span>

                                                        <span className="text-muted">Recall</span>
                                                        <span className="text-right font-mono">{linguistic.recall.toFixed(3)}</span>

                                                        <span className="text-muted">F1</span>
                                                        <span className="text-right font-mono">{linguistic.f1.toFixed(3)}</span>
                                                    </div>
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
             
        </section>
    );
}