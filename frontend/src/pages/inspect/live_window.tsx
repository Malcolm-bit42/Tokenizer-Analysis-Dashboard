import { useEffect, useRef, useState } from "react";
import { getRandomSentence, tokeniseText } from "../../api/api";
import type { TokenizeResponse } from "../../utils/types";
import { METRIC_INFO } from "../../components/metricsdescription";
import { MetricInfo } from "../metricinfo";
import { DropDown } from "../../components/dropdown";
import { Button } from "../../components/button";

const MAX_UPLOAD_BYTES = 3 * 1024 * 1024; // 3MB

interface LiveWindowProps {
    tokenizers: string[];
    loading: boolean;
    languages: Record<string, string>;
    onAddTokenizer: (value: string) => void;
}

export function LiveWindow({ tokenizers, loading, languages, onAddTokenizer }: LiveWindowProps) {
    // ─── Tokenize preview state (own tokenizer selection) ───
    const [previewTokenizer, setPreviewTokenizer] = useState<string>("");
    const [previewText, setPreviewText] = useState<string>("");
    const [previewResult, setPreviewResult] = useState<TokenizeResponse | null>(null);
    const [previewLoading, setPreviewLoading] = useState<boolean>(false);
    const [previewError, setPreviewError] = useState<string | null>(null);

    // ─── Random sentence generator ───
    const [randomLanguage, setRandomLanguage] = useState<string>("");
    const [randomLoading, setRandomLoading] = useState<boolean>(false);
    const [randomError, setRandomError] = useState<string | null>(null);

    // ─── File upload ───
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Default the tokenizer / random-sentence language once their option lists arrive.
    useEffect(() => {
        if (!previewTokenizer && tokenizers.length > 0) {
            setPreviewTokenizer(tokenizers[0]);
        }
    }, [tokenizers, previewTokenizer]);

    useEffect(() => {
        const languageCodes = Object.keys(languages);
        if (!randomLanguage && languageCodes.length > 0) {
            setRandomLanguage(languageCodes[0]);
        }
    }, [languages, randomLanguage]);

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

    // Fetches a random sentence in the chosen language and drops it into the preview box.
    const handleGenerateRandom = async () => {
        if (!randomLanguage) return;

        setRandomLoading(true);
        setRandomError(null);

        try {
            const languageName = languages[randomLanguage] ?? randomLanguage;
            const result = await getRandomSentence(languageName);
            setPreviewText(result.text);
            setUploadedFileName(null);
        } catch (err) {
            setRandomError(err instanceof Error ? err.message : "Failed to generate a random sentence.");
        } finally {
            setRandomLoading(false);
        }
    };

    // Reads an uploaded .txt file (max 3MB) into the preview box.
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = ""; // reset so the same file can be re-selected later
        if (!file) return;

        setUploadError(null);

        if (!file.name.toLowerCase().endsWith(".txt")) {
            setUploadError("Only .txt files are supported.");
            return;
        }

        if (file.size > MAX_UPLOAD_BYTES) {
            setUploadError(`File is too large (${(file.size / (1024 * 1024)).toFixed(2)}MB). Max size is 3MB.`);
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            setPreviewText(typeof reader.result === "string" ? reader.result : "");
            setUploadedFileName(file.name);
        };
        reader.onerror = () => setUploadError("Couldn't read that file. Please try again.");
        reader.readAsText(file);
    };

    const handleClear = () => {
        setPreviewText("");
        setUploadedFileName(null);
        setUploadError(null);
    };

    // Simple per-sentence efficiency stats for whatever is currently in the preview box.
    // fertility = tokens per word, compression = characters per token.
    const previewtokens = previewResult ? previewResult.metrics.token_count : null;
    const previewFertility = previewResult ? previewResult.metrics.fertility : null;
    const previewCompression = previewResult ? previewResult.metrics.compression : null;

    return (
        <div className="card flex flex-col gap-5 p-6 mt-4 mb-14">
            <p className="section-label">Tokenize Preview</p>

            <div className="flex flex-col md:flex-row gap-4">
                {/* Tokenizer dropdown for this box */}
                <div className="flex flex-col gap-2 w-full md:w-[280px]">
                    <DropDown
                        options={tokenizers}
                        placeholder="Tokenizer"
                        action={(e: any) => {
                            setPreviewTokenizer(e.target.value);
                            onAddTokenizer(e.target.value);
                        }}
                    />
                </div>

                {/* Text input */}
                <div className="flex flex-col gap-2 w-full">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                        <label htmlFor="preview-text-input" className="text-xs font-medium text-muted">
                            Text
                        </label>

                        <div className="flex items-center gap-2 flex-wrap">
                            {/* ─── Random sentence generator ─── */}
                            <select
                                value={randomLanguage}
                                onChange={(e) => setRandomLanguage(e.target.value)}
                                disabled={loading || Object.keys(languages).length === 0}
                                aria-label="Language for random sentence"
                                className="bg-canvas text-charcoal text-xs font-medium px-2 py-1.5 rounded-card border border-soft-border cursor-pointer outline-none appearance-none"
                            >
                                {Object.entries(languages).map(([code, name]) => (
                                    <option key={code} value={code}>{name}</option>
                                ))}
                            </select>
                            <Button
                                fill="bg-panel"
                                color="text-charcoal"
                                text={randomLoading ? "Generating…" : "🎲 Random sentence"}
                                action={handleGenerateRandom}
                                disabled={randomLoading || !randomLanguage}
                                className="!text-[12px] !px-[0.75rem] !py-[0.5rem] border border-soft-border"
                            />

                            {/* ─── Upload / clear ─── */}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".txt,text/plain"
                                onChange={handleFileUpload}
                                style={{ display: "none" }}
                            />
                            <Button
                                fill="bg-panel"
                                color="text-charcoal"
                                text="📄 Upload .txt"
                                action={() => fileInputRef.current?.click()}
                                className="!text-[12px] !px-[0.75rem] !py-[0.5rem] border border-soft-border"
                            />
                            <Button
                                fill="bg-panel"
                                color="text-charcoal"
                                text="🧹 Clear"
                                action={handleClear}
                                disabled={!previewText}
                                className="!text-[12px] !px-[0.75rem] !py-[0.5rem] border border-soft-border"
                            />
                        </div>
                    </div>

                    <textarea
                        id="preview-text-input"
                        value={previewText}
                        onChange={(e) => { setPreviewText(e.target.value); setUploadedFileName(null); }}
                        placeholder="Type or paste text to see how the tokenizer splits it..."
                        rows={3}
                        className="bg-canvas text-charcoal text-sm px-4 py-3 rounded-card border border-soft-border outline-none resize-none"
                    />
                    <span className="text-[11px] text-muted">
                        {uploadedFileName ? `📄 ${uploadedFileName} · ` : ""}{previewText.length} characters
                    </span>

                    {uploadError && <p className="text-xs text-bad">{uploadError}</p>}
                    {randomError && <p className="text-xs text-bad">{randomError}</p>}
                </div>
            </div>

            {previewError && (
                <p className="text-sm text-bad">
                    {previewError}
                </p>
            )}

            {/* Dark token preview panel */}
            <div className="card-dark p-5 min-h-[120px] flex flex-col gap-4">
                {previewText.trim().length === 0 ? (
                    <p className="text-sm text-dark-muted">
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
                        <p className="text-xs font-mono uppercase tracking-wide text-dark-muted">
                            {previewResult.token_count} tokens · {previewResult.model_id}
                        </p>

                        <div className="flex flex-wrap gap-2">
                            {previewResult.tokens.map((token, i) => (
                                <span
                                    key={i}
                                    title={`id: ${previewResult.token_ids[i]}`}
                                    className={`font-mono text-xs px-2 py-1 rounded-md border border-dark-surface ${
                                        i % 2 === 0
                                            ? "bg-dark-surface text-panel"
                                            : "bg-transparent text-panel"
                                    }`}
                                >
                                    {token}
                                </span>
                            ))}
                        </div>

                        {/* ─── Live fertility/compression stats for this sample ─── */}
                        {(previewFertility !== null || previewCompression !== null && previewtokens !== null) && (
                            <div className="flex gap-6 pt-3 mt-1 border-t border-dark-surface">
                                <div className="flex flex-col gap-0.5">
                                    <span className="text-[10px] uppercase tracking-wide text-dark-muted flex items-cente">
                                        Tokens<MetricInfo description={METRIC_INFO.token_count} />
                                    </span>

                                    <b className="font-mono text-sm text-panel">
                                        {previewtokens !== null ? previewtokens : "-"}
                                    </b>

                                </div>
                                <div className="flex flex-col gap-0.5">
                                    <span className="text-[10px] uppercase tracking-wide text-dark-muted flex items-center">
                                        Fertility<MetricInfo description={METRIC_INFO.fertility} />
                                    </span>
                                    <b className="font-mono text-sm text-panel">
                                        {previewFertility !== null ? previewFertility.toFixed(3) : "—"}
                                    </b>
                                </div>

                                <div className="flex flex-col gap-0.5">
                                    <span className="text-[10px] uppercase tracking-wide text-dark-muted flex items-center">
                                        Compression<MetricInfo description={METRIC_INFO.compression} />
                                    </span>
                                    <b className="font-mono text-sm text-panel">
                                        {previewCompression !== null ? previewCompression.toFixed(3) : "—"}
                                    </b>
                                </div>
                            </div>
                        )}
                    </>
                ) : null}
            </div>
        </div>
    );
}

export default LiveWindow;