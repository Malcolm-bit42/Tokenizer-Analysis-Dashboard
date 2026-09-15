import { useEffect, useState } from "react"
import { getLanguages, getLanguageSummary, getModelSummary, getTokenizers } from "../../api/api";
import { DropDown } from "../../components/dropdown";
import { Button } from "../../components/button";
import type { LanguageSummary, ModelSummary } from "../../utils/types";
import { Arrow } from "../../components/icons/arrow";
import { Dot } from "../../components/icons/dot";
import { LeaderBoardSkeleton } from "./leaderboard-skeleton";

const KEY:string = "tad-selected-models";
const HIDDEN_METRICS_KEY: string = "tad-hidden-metrics";
export type metric_t =  "avg_tokens" | "avg_fertility" | "avg_compression" | "avg_f1" | "avg_precision" | "avg_recall" | "avg_premium";


function loadSavedModels(): string[] {
    // this method will store the models the user has selected - pretty much a way tp store current leaderboard state
    try {
        const saved = localStorage.getItem(KEY);
        return saved ? JSON.parse(saved) : [];
    } catch {
        return [];
    }
}

function saveModels(models: string[]): void {
    localStorage.setItem(KEY, JSON.stringify(models));
}

function loadHiddenMetrics(): metric_t[] {
    try {
        const saved = localStorage.getItem(HIDDEN_METRICS_KEY);
        return saved ? JSON.parse(saved) : [];
    } catch {
        return [];
    }
}

function saveHiddenMetrics(metrics: metric_t[]): void {
    localStorage.setItem(HIDDEN_METRICS_KEY, JSON.stringify(metrics));
}

const availableMetrics: { id: metric_t, label: string }[] = [
    {id: "avg_tokens", label: "Avg. Tokens"},
    { id: "avg_fertility", label: "Avg. Fertility" },
    { id: "avg_compression", label: "Avg. Compression" },
    { id: "avg_precision", label: "Avg. Precision" },
    { id: "avg_f1", label: "Avg. F1" },
    { id: "avg_recall", label: "Avg. Recall" },
    {id: "avg_premium", label: "Avg. Premium"}
];

export default function Compare () {
    const [tokenizerModels, setTokenizerModels] = useState<string[]>([]);
    const [hiddenMetrics, setHiddenMetrics] = useState<metric_t[]>(loadHiddenMetrics);
    const [metrics, setMetrics] = useState<ModelSummary[]>([]);
    const [addedTokenisers, setAddedTokenisers] = useState<string[]>([]);
    const [sortBy, setSortBy] = useState<metric_t | "model_id" | "language">("avg_fertility");
    const [sortDirection, setSortDirection] = useState<"asc" |"desc">("asc");
    const [selectedTokenizer, setSelectedTokenizer] = useState<string>("");
    const [ _, setLanguages ] = useState<any[]>([]);
    const [langaugeMetrics, setLanguageMetrics] = useState<LanguageSummary[] | any>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [view, setView] = useState<"Language" | "Tokenizer">("Tokenizer");

    const fetchInitialData = async () => {
        setIsLoading(true);
        setError(null);

        try {
        // 1. Fire all requests concurrently
        const [tokenizers, languagesData, modelSummaryData, languageSummaryData] = await Promise.all([
            getTokenizers(),
            getLanguages(),
            getModelSummary(),
            getLanguageSummary()
        ]);

        // 2. Process and batch Tokenizers
        setTokenizerModels(tokenizers);
        if (tokenizers.length > 0) {
            setSelectedTokenizer(tokenizers[0]);
        }

        // 3. Process and batch Languages
        setLanguages(Object.values(languagesData));

        // 4. Process and batch Model Summaries
        setMetrics(modelSummaryData);
        const saved = loadSavedModels();

        setLanguageMetrics(languageSummaryData);
        
        if (saved.length > 0) {
            setAddedTokenisers(saved);
        } else {
            const defaultModels = modelSummaryData.slice(0, 5).map((d: any) => d.model_id);
            setAddedTokenisers(defaultModels);
            saveModels(defaultModels);
        }

        } catch (err: any) {
            console.error("Failed to load initial page data:", err);
            setError(err?.message || "An unexpected error occurred while loading leaderboard data.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchInitialData();
    }, []);

    const tableColumns: string[] = ["#", view, ...availableMetrics.filter(m => !hiddenMetrics.includes(m.id)).map(m => m.label), ""];

    const toggleMetric = (metricId: metric_t) => {
        setHiddenMetrics(prev => {
            const next = prev.includes(metricId) ? prev.filter(m => m !== metricId) : [...prev, metricId];
            saveHiddenMetrics(next);
            return next;
        });
    }

    const handleSort = (metric: metric_t | "model_id" | "language") => {
        if (sortBy === metric) {
            setSortDirection((currentDirection) =>currentDirection === "asc" ? "desc" : "asc");
        } else {
            setSortBy(metric);
            setSortDirection("desc");
        }
    }


    const displayData = [...(view === "Tokenizer" ? metrics : langaugeMetrics)]
        .filter((m) => view === "Tokenizer" ? addedTokenisers.includes(m.model_id) : true)
        .sort((a, b) => {
            if (sortBy === "model_id") {
                return sortDirection === "asc" ? a.model_id.localeCompare(b.model_id) : b.model_id.localeCompare(a.model_id);
            } else if (sortBy === "language") return sortDirection === "asc" ? a.language.localeCompare(b.language) : b.language.localeCompare(a.language);

            return sortDirection === "asc" ? a[sortBy] - b[sortBy] : b[sortBy] - a[sortBy];
    });

    const getMetricKey = (column: string): metric_t | "model_id" | "language" | null => {
        if (column === "Tokenizer") return "model_id";
        if (column === "Language") return "language";
        if (column === "#" || column === "Action") return null;
        return column.toLowerCase().replaceAll(".", "").replaceAll(" ", "_") as metric_t;
    }

    // console.log(langaugeMetrics)

    const sortIndicator = (metric: string | null) => {
        if (!metric || metric !== sortBy) {
            return <span className="w-3 inline-block" />;
        }

        return sortDirection !== "asc" ? <span className="w-3 inline-block"><Arrow /></span>: <span className="w-3 inline-block rotate-[180deg]"><Arrow /></span>;
    }


    const availableTokenizers = tokenizerModels.filter(tokenizer => !addedTokenisers.includes(tokenizer));

    const handleAddTokenizer = () => {
        if (selectedTokenizer && !addedTokenisers.includes(selectedTokenizer)) {
            const newAdded = [...addedTokenisers, selectedTokenizer];
            setAddedTokenisers(newAdded);
            saveModels(newAdded);
            if (availableTokenizers.length > 1) {
                const nextAvailable = availableTokenizers.find(tokenizer => tokenizer !== selectedTokenizer);
                if (nextAvailable) setSelectedTokenizer(nextAvailable);
            }
        }
    }

    const handleRemoveTokenizer =(data: any) => {
        const newAdded = addedTokenisers.filter(t => t !== data.model_id);
        setAddedTokenisers(newAdded);
        saveModels(newAdded);
    }

    // be able to filter metrics summary based on langauge?? doe sit returnn the avg of all?? hmmmm.
    if (isLoading) return <LeaderBoardSkeleton />;

    if (error) return (
        <section className="w-full flex flex-col items-center justify-center py-20 gap-6">
            <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-lg p-6 max-w-lg w-full text-center">
                <p className="text-[#991B1B] font-bold text-lg mb-2">Something went wrong</p>
                <p className="text-[#B91C1C] text-sm mb-4">{error}</p>
                <button
                    onClick={fetchInitialData}
                    className="bg-[#000] text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-[#333] transition-colors cursor-pointer"
                >
                    Try Again
                </button>
            </div>
        </section>
    );

    return (
        <>
            <section className="w-full">
                <div className="flex justify-between items-center bg-[#EBE9E4] p-3 rounded-lg mb-10">
                    <div className="flex gap-5">
                        <DropDown disbale={view === "Language"} options={availableTokenizers} placeholder="Add Model To Leaderboard" action={(e: any) => setSelectedTokenizer(e.target.value)} />
                        {/* <DropDown options={languages} placeholder="Select a Language" /> */}
                        <Button action={handleAddTokenizer} text="+ Add tokenizer" className={`${view === "Language" && "pointer-events-none cursor-default"} !rounded-lg`}disabled={view === "Language"}/>
                    </div>

                    <div className="flex gap-4 items-center">
                            {/* Be able to toggle between ranking by language and ranking by tokenizers */}
                            <p className="section-label !font-bold !text-[#000]">
                                {
                                    view === "Tokenizer" ? "Rank By Language." : "Revert to tokenizer ranking."
                                }
                            </p>
                            <div className={`before:transition-all pointer-events-none before:pointer-events-auto w-[70px] relative bg-[#000] h-[28px] rounded-pill before:content-[''] before:w-[20px] before:h-[20px] before:bg-[#fff] before:absolute before:top-[50%] before:translate-y-[-50%] before:rounded-full hover:before:cursor-pointer ${view === "Language" ? "before:left-[46px] before:translate-x[-46px]" : "before:left-[4px] before:translate-x[-4px]"}`} onClick={() => view === "Language" ? setView("Tokenizer") : setView("Language")}>
                                {/* Left = 4px, right = width - diameter of :before - left px */}
                                {/* py -> 4px b 4px t */}
                                {/* Therefore, set left to 4px */}
                                {/* right = 70px - 20px - 4px = 46px */}
                                {/* Ts is lowkey kinda ahh, not what I envisioned, but oh well */}
                            </div>

                           
                        
                    </div>
                    
                    {/* <Button action={() =>  view == "Language" ? setView("Tokenizer") : setView("Language")} text={view} /> */}
                   
                </div>
                <div className="flex gap-5 mb-10">
                    {
                        availableMetrics.map(metric => (
                            <Button className="!text-[11px] !px[.5rem] !py-[.5rem]" icon={<Dot color={["#22a06b", "#e45a3b", "#d97706", "#2563eb"][Math.floor(Math.random() * 4)] as string} />} key={metric.id} text={metric.label} action={() => toggleMetric(metric.id)} disabled={hiddenMetrics.includes(metric.id)}/>
                        ))
                    }
                </div>
                <table className="w-full border-[.1px] border-[#ddd] mb-10 ">
                    <thead className="">
                        <tr className="section-label">
                            {
                                tableColumns.map((column: string, _: number) => {
                                    const metricKey = getMetricKey(column);
                                    return (
                                        <td key={column} className="py-5 px-3 cursor-pointer" onClick={() => {if (metricKey) handleSort(metricKey);}}>
                                            <p className="flex gap-3 items-center">
                                            {sortIndicator(metricKey)}
                                            {column}
                                            </p>
                                        </td>
                                    )
                                })
                            }
                        </tr>
                    </thead>

                    <tbody className="bg-panel section-label ">
                            {
                                view === "Language" ? (
                                displayData.map((data: LanguageSummary, index: number) => (
                                    <tr key={data.language} className="text-charcoal border-b-[.1px] border-b-[#ddd]">
                                        <td className="py-3 pl-8 font-bold">{index + 1}</td>
                                        <td className="p-3 font-bold pl-10">{data.language}</td>
                                           
                                        {
                                            // Object.values(data).map((metric, _) =>  <td key={data.language} className="p-3 text-center">{data[data.language as keyof LanguageSummary] as string}</td>)
                                            availableMetrics.filter((m) => !hiddenMetrics.includes(m.id)).map((metric) => (
                                                <td key={metric.id} className="p-3 text-center">{data[metric.id as keyof LanguageSummary] as string}</td>
                                            ))

                                        }
                                        <td className="py-3 px-0">
                                            {/* <button onClick={() => handleRemoveTokenizer(data)} className="hover:text-red-500 font-bold px-2 py-1 rounded cursor-pointer">
                                                &#x2715;
                                            </button> */}
                                        </td>
                                    </tr>
                                ))) : (
                                displayData.map((data: ModelSummary, index: number) => (
                                        <tr key={data.model_id} className="text-charcoal border-b-[.1px] border-b-[#ddd]">
                                            <td className="py-3 pl-8 font-bold">{index + 1}</td>
                                            <td className="p-3 font-bold">{data.model_id}</td>
                                            {
                                                availableMetrics.filter(m => !hiddenMetrics.includes(m.id)).map((metric) => (
                                                        <td key={metric.id} className="p-3 text-center">
                                                            {data[metric.id as keyof ModelSummary] as string}
                                                        </td>
                                                    ))
                                            }
                                            <td className="py-3 px-0">
                                                <button onClick={() => handleRemoveTokenizer(data)} className="hover:text-red-500 font-bold px-2 py-1 rounded cursor-pointer">
                                                    &#x2715;
                                                </button>
                                            </td>
                                        </tr>
                                )))
                            }
                    </tbody>
                </table>
            </section>
        </>
    )
}
