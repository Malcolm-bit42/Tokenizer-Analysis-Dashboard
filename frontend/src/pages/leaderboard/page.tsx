import { useEffect, useState } from "react"
import { getLanguages, getMetrics, getTokenizers } from "../../api/api";
import { DropDown } from "../../components/dropdown";

export default function Compare () {
    const [langauges, setLanguages] = useState<Record<string, string>>({});
    const [tokenizerModels, setTokenizerModels] = useState<string[]>([]);
    const [metricType, setMetricType] = useState<"all" | "efficiency" | "linguistic">("all");
    const [metrics, setMetrics] = useState<any>();

    useEffect(() => {
       getTokenizers().then(setTokenizerModels).catch((error) => console.error("Error fetching tokenizers: " + error));

    }, []);

    useEffect(() => {
        getLanguages().then(setLanguages).catch((error) => console.error("Error fetching lnaguages: " + error));
    }, []);

    

    // get default metrics

    useEffect(() => {
        async function fetchMetrics() {
            try {
                if (langauges && tokenizerModels && metricType) {
                const metrics = await getMetrics(tokenizerModels[0], new Array(Object.values(langauges)[0]), metricType);

                console.log(metrics)
            }
            } catch (error) {
                console.error(error);
                throw error;
            }
        }

        fetchMetrics();
     

    }, []);
    



    const handleLanguageSubmit = async (event: any) =>{
        const language = event.target.value;
        try {
            // const res = await getMetrics()
        } catch (error) {
            
        }
    }




    return (
        <>
            <section className="w-full">
                <div className="flex gap-3 bg-[#EBE9E4] p-3 rounded-lg">
                    <DropDown options={tokenizerModels} placeholder="Model" action={handleLanguageSubmit} />
                    <DropDown options={Object.values(langauges)} placeholder="Langues" />
                    <DropDown options={["All", "Effiiency", "Linguistic"]} placeholder="Metric Type"/>
                </div>
                
            </section>
        </>
    )
}
