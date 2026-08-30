import { useEffect, useState } from "react"
import { getModelSummary, getTokenizers } from "../../api/api";
import { DropDown } from "../../components/dropdown";
import { Button } from "../../components/button";
import type { ModelSummary } from "../../utils/types";
import { Arrow } from "../../components/icons/arrow";

const KEY:string = "tad-selected-models";

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


export default function Compare () {
    type metric_t = "avg_fertility" | "avg_compression" | "avg_f1" | "avg_precision" | "avg_recall"
    const [tokenizerModels, setTokenizerModels] = useState<string[]>([]);
    const [metrics, setMetrics] = useState<ModelSummary[]>([]);
    const [addedTokenisers, setAddedTokenisers] = useState<string[]>([]);
    const [sortBy, setSortBy] = useState<metric_t | "model_id">("avg_fertility");
    const [sortDirection, setSortDirection] = useState<"asc" |"desc">("asc");
    const [selectedTokenizer, setSelectedTokenizer] = useState<string>("");

    useEffect(() => {

       getTokenizers().then((tokenizers) => {
           setTokenizerModels(tokenizers);
           if (tokenizers.length > 0) setSelectedTokenizer(tokenizers[0]);
       }).catch((error) => console.error("Error fetching tokenizers: " + error));


       getModelSummary().then((data: ModelSummary[] | any) => {
           setMetrics(data);

           const saved = loadSavedModels();

           if (saved.length > 0) {
               setAddedTokenisers(saved);
           } else {
               const defaultModels = data.slice(0, 5).map((d: any) => d.model_id);
               setAddedTokenisers(defaultModels);
               saveModels(defaultModels);
           }
       }).catch(error => console.error("Error getting summaries: " + error));

    }, []);

    const tableColumns: string[] = ["#", "Tokenizer", "Avg. Fertility", "Avg. Compression", "Avg. F1", "Avg. Precision", "Avg. Recall", ""];

        const handleSort = (metric: metric_t | "model_id") => {
            if (sortBy === metric) {
                setSortDirection((currentDirection) =>
                    currentDirection === "asc" ? "desc" : "asc"
                );
            } else {
                setSortBy(metric);
                setSortDirection("desc");
            }
        }


    const displayData = [...metrics].filter((m) => addedTokenisers.includes(m.model_id)).sort((a, b) => {
            if (sortBy === "model_id") {
                return sortDirection === "asc" ? a.model_id.localeCompare(b.model_id) : b.model_id.localeCompare(a.model_id);
            }

            return sortDirection === "asc" ? a[sortBy] - b[sortBy] : b[sortBy] - a[sortBy];
    });

    const getMetricKey = (column: string): metric_t | "model_id" | null => {
        if (column === "Tokenizer") return "model_id";
        if (column === "#" || column === "Action") return null;
        return column.toLowerCase().replaceAll(".", "").replaceAll(" ", "_") as metric_t;
    }

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

    return (
        <>
            <section className="w-full">
                <div className="flex gap-3 bg-[#EBE9E4] p-3 rounded-lg mb-10">
                    <DropDown options={availableTokenizers} placeholder="Add Model To Leaderboard" action={(e: any) => setSelectedTokenizer(e.target.value)} />
                    <Button action={handleAddTokenizer} text="+ Add tokenizer" className="!rounded-lg"/>
                </div>
                <table className="w-full border-[.1px] border-[#ddd] mb-10 ">
                    <thead className="">
                        <tr className="section-label">
                            {
                                tableColumns.map((column: string, index: number) => {
                                    const metricKey = getMetricKey(column);
                                    return (
                                        <td key={index} className="py-5 px-3 cursor-pointer" onClick={() => {if (metricKey) handleSort(metricKey);}}>
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
                              displayData.map((data: ModelSummary, index: number) => (
                                    <tr key={data.model_id} className="text-charcoal border-b-[.1px] border-b-[#ddd]">
                                        <td className="py-3 pl-8">{index + 1}</td>
                                        {
                                            Object.values(data).map((data) => <td key={data.model_id} className="p-3">{data}</td>)
                                        }
                                        <td className="py-3 px-0">
                                            <button onClick={() => handleRemoveTokenizer(data)} className="hover:text-red-500 font-bold px-2 py-1 rounded cursor-pointer">
                                                &#x2715;
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            }
                    </tbody>
                </table>
            </section>
        </>
    )
}
