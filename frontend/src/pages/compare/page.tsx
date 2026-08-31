import { useEffect, useState } from "react";
import { getLanguages, getTokenizers } from "../../api/api";
import { tokeniseText } from "../../api/api"
import { getMetrics } from "../../api/api"
import type { languages_t, metric_t } from "../../utils/types";
import "./style.css";



async function getTokenizedText( modelID1: string, modelID2:string, text:string){

    try{
        const data1 = await tokeniseText(modelID1, text)
        const data2 = await tokeniseText(modelID2, text)
        return {data1, data2}

    }catch (error){
        console.error(error)
        return {}
    }

}


async function getModelMetrics(modelID1: string,modelID2:string, language: string, metric_type: metric_t){

    try{
        const languages = new Array(language);
        const data1 = await getMetrics(modelID1, languages, metric_type)
        const data2 = await getMetrics(modelID2, languages, metric_type)
        return {data1, data2}

    }catch (error){
        console.error(error)
    }
}


export default function Compare() {
    const [tokenizers, setTokenizers] = useState<string[]>([]);
    const [tokenizer1, setTokenizer1] = useState("");
    const [tokenizer2, setTokenizer2] = useState("");
    const [inputText, setInputText] = useState("");
    const [fileText, setFileText] = useState("");
    const [languages, setLanguages] = useState<[string, string][]>([]);
    const [language, setLanguage] = useState("");
    const [tokenizedText1, setTokenizedText1] = useState<string[]>([]);
    const [tokenizedText2, setTokenizedText2] = useState<string[]>([]);


   useEffect(() => {
        async function tok() {
            try {
                    const d = await getTokenizers();
                    const d2 = await getLanguages();
                    setTokenizers(d);
                    setLanguages(Object.entries(d2))
                    console.log(d)
                    console.log(d2)
                    

            } catch (error) {
                console.error(error)
            }
            
        }
        
        tok();
    },[])

    function removeFile() {
        setFileText("");
    }

    async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];

        if (!file) {
            return;
        }

        if (file.type !== "text/plain") {
            console.log("This is not a text file.");
            return;
        }

        const text = await file.text();
        const cleanedText = text.replace(/\r?\n/g, " ");

        console.log(cleanedText);
        setFileText(cleanedText)
    }  

    function getTokenClass(token: string) {


        if (token.startsWith("##")) {
            return "bg-yellow-300 text-black";
        }

        if (token.startsWith("Ġ") || token.startsWith("▁") ){
            return "bg-green-300 text-black";
        }

        
        return "bg-gray-200 text-black";
    }

    function displayEfficiencyMetrics(metrics: any) {

        const tokenizer1Metrics = metrics.data1.efficiency[language];
        const tokenizer2Metrics = metrics.data2.efficiency[language];

        document.getElementById("fertility1")!.textContent =
            tokenizer1Metrics.fertility.toFixed(2);

        document.getElementById("fertility2")!.textContent =
            tokenizer2Metrics.fertility.toFixed(2);

        document.getElementById("compression1")!.textContent =
            tokenizer1Metrics.compression.toFixed(2);

        document.getElementById("compression2")!.textContent =
            tokenizer2Metrics.compression.toFixed(2);

        document.getElementById("tokenCount1")!.textContent =
            tokenizer1Metrics.token_count.toFixed(2);

        document.getElementById("tokenCount2")!.textContent =
            tokenizer2Metrics.token_count.toFixed(2);
    }

    function displayLinguisticMetrics(metrics: any) {

        const tokenizer1Metrics = metrics.data1.linguistic[language];
        const tokenizer2Metrics = metrics.data2.linguistic[language];

        if (tokenizer1Metrics) {
            document.getElementById("precision1")!.textContent =
                tokenizer1Metrics.precision?.toFixed(2) ?? "";

            document.getElementById("recall1")!.textContent =
                tokenizer1Metrics.recall?.toFixed(2) ?? "";

            document.getElementById("f1Score1")!.textContent =
                tokenizer1Metrics.f1?.toFixed(2) ?? "";
        } else {
            document.getElementById("precision1")!.textContent = "";
            document.getElementById("recall1")!.textContent = "";
            document.getElementById("f1Score1")!.textContent = "";
        }

        if (tokenizer2Metrics) {
            document.getElementById("precision2")!.textContent =
                tokenizer2Metrics.precision?.toFixed(2) ?? "";

            document.getElementById("recall2")!.textContent =
                tokenizer2Metrics.recall?.toFixed(2) ?? "";

            document.getElementById("f1Score2")!.textContent =
                tokenizer2Metrics.f1?.toFixed(2) ?? "";
        } else {
            document.getElementById("precision2")!.textContent = "";
            document.getElementById("recall2")!.textContent = "";
            document.getElementById("f1Score2")!.textContent = "";
        }
    }
        
    async function handleSubmit() {

        if (tokenizer1 === "") {
            console.log("Please select Tokenizer 1");
            return;
        }

        if (tokenizer2 === "") {
            console.log("Please select Tokenizer 2");
            return;
        }

        if (language === "") {
            console.log("Please select a language");
            return;
        }

        try {
            let text;
            
            console.log(language)
            const efficiencyMetrics = await getModelMetrics(tokenizer1,tokenizer2, language, "efficiency")
            const linguisticMetrics = await getModelMetrics(tokenizer1,tokenizer2, language, "linguistic")
            
            if (efficiencyMetrics && efficiencyMetrics.data1 && efficiencyMetrics.data2) {
                
                displayEfficiencyMetrics(efficiencyMetrics);
            }else{
                console.log("No efficiency metrics were returned.");
            }

            if (linguisticMetrics && linguisticMetrics.data1 && linguisticMetrics.data2) {
                
                displayLinguisticMetrics(linguisticMetrics);
            }else{
                console.log("No linguistic metrics were returned.");
            }

            
            

            if (fileText !== "") {
                text = fileText;
            }
            else{
                text = inputText;
            }

            if (text === "") {
                text = "This is a default sentence.";
            }

            console.log("Text being submitted:", text);

            const tokenisedData = await getTokenizedText( tokenizer1,tokenizer2, text)
            console.log(efficiencyMetrics);
            console.log(linguisticMetrics);
            console.log(tokenisedData)
            setTokenizedText1(tokenisedData.data1.tokens);
            setTokenizedText2(tokenisedData.data2.tokens);

        } catch (error) {
            console.error(error);
        }
    }



    return (
        <div>
            <h1>Compare Tokenizers</h1>
            <div style={{ display: "flex" }}>
    
                <div>
                    <div>
                        <h3>{tokenizer1}</h3>

                        <div className="border p-4">

                            {tokenizedText1.slice(0, 50).map((token, index) => {

                                let displayToken = token;

                               
                                if (displayToken.startsWith("##")) {
                                    displayToken = displayToken.substring(2);
                                }

                               
                                if (displayToken.startsWith("Ġ") || displayToken.startsWith("▁") ) {
                                    displayToken = displayToken.substring(1);
                                }

                                return (
                                    <span
                                        key={index}
                                        className={`inline-block ${getTokenClass(token)} px-2 py-1 m-1 rounded`}
                                    >
                                        {displayToken}
                                    </span>
                                );
                            })}
                        </div>
                        <h3>{tokenizer2}</h3>

                            <div className="border p-4">

                                {tokenizedText2.slice(0, 50).map((token, index) => {

                                    let displayToken = token;

                                
                                    if (displayToken.startsWith("##")) {
                                        displayToken = displayToken.substring(2);
                                    }

                                    
                                    if (displayToken.startsWith("Ġ")) {
                                        displayToken = displayToken.substring(1);
                                    }

                                    return (
                                        <span
                                            key={index}
                                            className={`inline-block ${getTokenClass(token)} px-2 py-1 m-1 rounded`}
                                        >
                                            {displayToken}
                                        </span>
                                    );
                                })}
                            </div>
                    </div>

                    <input type="text" id = "userText" placeholder="Enter text" className="w-full h-32 bg-white text-black border border-gray-400 rounded-md p-3 resize-none" value={inputText}
                        onChange={(event) => setInputText(event.target.value)}
                    />
                    <button onClick={() => handleSubmit()} className="submit-button" > Submit</button>
                    <input type="file" accept=".txt" onChange={handleFileChange} />
                    <button type="button" onClick={removeFile}>
                        Remove File
                    </button>
                </div>
                <div className="tokenizer-container">
                    <div>
                        <label>Tokenizer 1: </label>

                        <select value={tokenizer1} onChange={(event) => setTokenizer1(event.target.value)} className="tokenizer-select">
                            <option value="">Select a tokenizer</option>

                            {tokenizers.map((tokenizer) => (
                                <option key={tokenizer} value={tokenizer}>
                                    {tokenizer}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label>Tokenizer 2: </label>

                        <select value={tokenizer2} onChange={(event) => setTokenizer2(event.target.value)} className="tokenizer-select">
                            <option value="">Select a tokenizer</option>

                            {tokenizers.map((tokenizer) => (
                                <option key={tokenizer} value={tokenizer}>
                                    {tokenizer}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label>Language: </label>
                        <select value={language} onChange={(event) => setLanguage(event.target.value)} className="language-select">
                            <option value="">Select language</option>

                            {languages.map(([key, name]) => (
                                <option key={key} value={name}>
                                    {name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            
            </div>
                <div>
                    <h2 className="text-2xl font-bold mb-4">
                        Results
                    </h2>

                    <div className="overflow-x-auto">
                        <table className="metrics-table">
                            <thead>
                                <tr>
                                    <th>Metric</th>
                                    <th>{tokenizer1}</th>
                                    <th>{tokenizer2}</th>
                                </tr>
                            </thead>

                            <tbody>

                                <tr>
                                    <th colSpan={3} className="metrics-section">
                                        Efficiency
                                    </th>
                                </tr>

                                <tr>
                                    <td>Fertility</td>
                                    <td id="fertility1"></td>
                                    <td id="fertility2"></td>
                                </tr>

                                <tr>
                                    <td>Compression</td>
                                    <td id="compression1"></td>
                                    <td id="compression2"></td>
                                </tr>

                                <tr>
                                    <td>Token Length</td>
                                    <td id="tokenCount1"></td>
                                    <td id="tokenCount2"></td>
                                </tr>

                                <tr>
                                    <th colSpan={3} className="metrics-section">
                                        Linguistic
                                    </th>
                                </tr>

                                <tr>
                                    <td>Precision</td>
                                    <td id="precision1"></td>
                                    <td id="precision2"></td>
                                </tr>

                                <tr>
                                    <td>Recall</td>
                                    <td id="recall1"></td>
                                    <td id="recall2"></td>
                                </tr>

                                <tr>
                                    <td>F1</td>
                                    <td id="f1Score1"></td>
                                    <td id="f1Score2"></td>
                                </tr>

                            </tbody>
                        </table>
               </div>
                </div>

            </div>

        
    );
}