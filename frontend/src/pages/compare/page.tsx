import { useEffect, useState } from "react";
import { getLanguages, getTokenizers } from "../../api/api";
import { tokeniseText } from "../../api/api"
import { getMetrics } from "../../api/api"
import type { languages_t, metric_t } from "../../utils/types";
import "./style.css";
import {ScatterChart, Scatter,XAxis,YAxis,CartesianGrid,Tooltip,Legend,ResponsiveContainer} from "recharts";
import { DropDown } from "../../components/dropdown.tsx";

//default language corpora sentences when language is selected
const defaultSentences: Record<string, string> = {
    English: "Local media reports an airport fire vehicle rolled over while responding.",
    "Afrikans": "Plaaslike media berig ‘n lughawe brandweervoertuig het gerol terwyl hul gereageer het.",
    "Northen Sotho": "Diphatlalatšo ya ditaba tša selegae di bega gore senamelwa sa moolo sa boemafofane se tokologile ge se bitšwa.",
    "Southern Sotho": "Ditlaleho tsa masedinyana a lehae di re setima-mollo sa boemafofane se ile sa phethoha ha sene se phallela koduwa ena.",
    "Swati" : "Imibiko yemaphephandzaba ibike ngemoto yemlilo legicikile ngesikhatsi iya endzaweni lokwenteke kuyo ingoti.",
    "Tswana" : "Bobegadikgang jwa lefelo leo bo begile fa koloi ya setimamolelo ya maemelo-difofane e ne ya pitikologa e le mo letsholong la go thusa mo tiragalong e.",
    "Tsonga" : "Swiviko swa vuhaxamahungu swi vula leswaku movha wo tima ndzilo wa le rivaleni ra swihahampfhuka wu vumbulukile loko wu ya eku pfuneni.",
    "Xhosa" : "Oonondaba basekuhlaleni bxele ukuba isithuthi somlilo sesitishi senqwelomoya siye saphethuka sisazama ukunceda.",
    "Zulu" : "Abezindaba bendawo babika ukuthi imoto yomlilo yasesikhumulweni sezindiza yaginqikangenkathi iphuthuma.",
    };

//It takes the two models as input and a string and makes api requests to give tokenized string
async function getTokenizedText( modelID1: string, modelID2:string, text:string){

    try{
        const data1 = await tokeniseText(modelID1, text)
        const data2 = await tokeniseText(modelID2, text)
        return {data1, data2}

    }catch (error){
        console.error("Failed to fetch tokenised text, tokenizers might not be available")
        return {}
    }

}

// get Retrieves the metrics of the models from a backend api with the selected language
async function getModelMetrics(modelID1: string,modelID2:string, language: string, metric_type: metric_t){

    try{
        const languages = new Array(language);
        const data1 = await getMetrics(modelID1, languages, metric_type)
        const data2 = await getMetrics(modelID2, languages, metric_type)
        return {data1, data2}

    }catch (error){
        console.error("Failed to get metrics, the tokenizers might not be available")
    }
}

//This is our main function of the file that handles everything is called by the main page
export default function Compare() {

    //Using use state variable to automatically update the vaiables when there are changes
    const [tokenizers, setTokenizers] = useState<string[]>([]);
    const [tokenizer1, setTokenizer1] = useState("");
    const [tokenizer2, setTokenizer2] = useState("");
    const [inputText, setInputText] = useState("");
    const [fileText, setFileText] = useState("");
    const [languages, setLanguages] = useState<[string, string][]>([]);
    const [language, setLanguage] = useState("");
    const [tokenizedText1, setTokenizedText1] = useState<string[]>([]);
    const [tokenizedText2, setTokenizedText2] = useState<string[]>([]);
    const [fileError, setFileError] = useState("");
    //This is the default data for the scatter graph for fertility vs compression
    const [scatterData, setScatterData] = useState([
    { tokenizer: "", compression: 0, fertility: 0 },
    { tokenizer: "", compression: 0, fertility: 0 }
    ]);
    //This is the default data for the comparison row
    const [comparisonRows, setComparisonRows] = useState<any[]>([
        {name: "Fertility", value1: 0,value2: 0},
        {name: "Compression", value1: 0, value2: 0},
        {name: "Token Length", value1: 0,value2: 0},
        {name: "Precision",value1: 0,value2: 0},
        {name: "Recall",value1: 0,value2: 0},
        {name: "F1",value1: 0,value2: 0}
    ]);
    

    //Twhen the program first starts to get all the languages and tokenizers to use on the drop downs, 
   useEffect(() => {
        async function tok() {
            try {
                    //waits for backend to come with the data 
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
    //This is for live tokenization, redirects the correct input to be tokenized
    useEffect(() => {
        if (tokenizer1 === "" || tokenizer2 === "") {
            return;
        }
        //Makes the tokenized text default corpora if user didnt enter text in input area
        console.log("Selected language:", language);
        let textToTokenize = inputText;
        if (textToTokenize === "") {
            textToTokenize = defaultSentences[language] || "";
        }

        if (textToTokenize === "") {
            return;
        }

        //The time out is too prevent tokenizing everytime you make quick minor changes to the user text area
        const timer = setTimeout(async () => {
            const data = await getTokenizedText(tokenizer1, tokenizer2, textToTokenize);
            try{
            setTokenizedText1(data.data1.tokens);
            setTokenizedText2(data.data2.tokens);
            }
            catch(error){
                 console.error("Failed to gtokenize text")
            }
        }, 400);
        return () => clearTimeout(timer);

    }, [inputText, tokenizer1, tokenizer2, language]);

    
    //When uploading a file, this function is called , it turns the text file into a single string to be tokenized
    async function uploadedFile(event: React.ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];

        //checks if the file is there, if not, the whole function does nothing
        if (!file) {
            return;
        }
        //If the file is not a text file and cannot be turned into a string, it stop the function
        if (file.type !== "text/plain") {
            console.log("This is not a text file.");
            return;
        }

        
        //waits for the file to be loaded into text and cleans it
        const text = await file.text();
        const cleanedText = text.replace(/\r?\n/g, " ");
        // if file has too many characters, this is too reduce overloading on the backend
        const MAX_CHARACTERS = 10000;
        if (text.length > MAX_CHARACTERS) {
            setFileError("File is too large. Maximum allowed is 10,000 characters.");
            return;
        }

        setFileError("");
        
        //stores the text into a variable
        console.log(cleanedText);
        setFileText(cleanedText)
    }  
    //This what happens when you submit file for tokenization
    async function submitFile() {
        //if file text empty
        if (fileText === "") {
            console.log("Please select a file.");
            return;
        }
        //if tokenizers not selected
        if (tokenizer1 === "") {
            console.log("Please select Tokenizer 1.");
            return;
        }

        if (tokenizer2 === "") {
            console.log("Please select Tokenizer 2.");
            return;
        }



        try {
            //tokenizes data and stores it
            const tokenisedData = await getTokenizedText(tokenizer1, tokenizer2,fileText);

            console.log("Tokenized file:", tokenisedData);

            setTokenizedText1(tokenisedData.data1.tokens);
            setTokenizedText2(tokenisedData.data2.tokens);

        } catch (error) {
            console.error("Failed to tokenize file:", error);
        }
    }

    //This is to bring back the styling of token depending if its a subword, or a start of the word, this is not consitent since not all tokenizers have the same format
    function getTokenClass(token: string) {

        
        if (token.startsWith("##")) {
            return "bg-yellow-300 text-black";
        }
        //if beginning of word, the color of the text is green
        if (token.startsWith("Ġ") || token.startsWith("▁") ){
            return "bg-green-300 text-black";
        }

        //if normal word the gray
        return "bg-gray-200 text-black";
    }

    // This gets the elements of the efficiency metrics from the table and maps their values
    function displayEfficiencyMetrics(metrics: any) {

        //the metrics are extracted from the backend retrieval form getmetrics
        const tokenizer1Metrics = metrics.data1.efficiency[language];
        const tokenizer2Metrics = metrics.data2.efficiency[language];

        //each value has a decimal place of two
        document.getElementById("fertility1")!.textContent = tokenizer1Metrics.fertility.toFixed(2);
        document.getElementById("fertility2")!.textContent = tokenizer2Metrics.fertility.toFixed(2);
        document.getElementById("compression1")!.textContent = tokenizer1Metrics.compression.toFixed(2);
        document.getElementById("compression2")!.textContent = tokenizer2Metrics.compression.toFixed(2);
        document.getElementById("tokenCount1")!.textContent = tokenizer1Metrics.token_count.toFixed(2);
        document.getElementById("tokenCount2")!.textContent = tokenizer2Metrics.token_count.toFixed(2);
    }

    // This gets the elements of the efficiency metrics from the table and maps their values
    function displayLinguisticMetrics(metrics: any) {

            //the metrics are extracted from the backend retrieval form getmetrics
        const tokenizer1Metrics = metrics.data1.linguistic[language];
        const tokenizer2Metrics = metrics.data2.linguistic[language];

        //Since some languages dont have linguistic metrics like english, i this makes sures the values in the table are empy if the language doesnt have them
        if (tokenizer1Metrics) {
            document.getElementById("precision1")!.textContent = tokenizer1Metrics.precision?.toFixed(2) ?? "";
            document.getElementById("recall1")!.textContent = tokenizer1Metrics.recall?.toFixed(2) ?? "";
            document.getElementById("f1Score1")!.textContent = tokenizer1Metrics.f1?.toFixed(2) ?? "";
        } else {
            document.getElementById("precision1")!.textContent = "";
            document.getElementById("recall1")!.textContent = "";
            document.getElementById("f1Score1")!.textContent = "";
        }

        if (tokenizer2Metrics) {
            document.getElementById("precision2")!.textContent = tokenizer2Metrics.precision?.toFixed(2) ?? "-";
            document.getElementById("recall2")!.textContent = tokenizer2Metrics.recall?.toFixed(2) ?? "-";
            document.getElementById("f1Score2")!.textContent = tokenizer2Metrics.f1?.toFixed(2) ?? "";
        } else {
            document.getElementById("precision2")!.textContent = "-";
            document.getElementById("recall2")!.textContent = "-";
            document.getElementById("f1Score2")!.textContent = "-";
        }
    }
        
    //This functions basically kickstarts everything, when they user presses the submit button
    async function Submision(textToSubmit: string) {

        //This make sures that the user cannot proceed without selecting the tokenezers and the language
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
           
            //This gets the different types of metrics and 
            console.log(language)
            const efficiencyMetrics = await getModelMetrics(tokenizer1,tokenizer2, language, "efficiency")
            const linguisticMetrics = await getModelMetrics(tokenizer1,tokenizer2, language, "linguistic")
            
            //This calls on the display metrics function if the data is valid
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

            if (efficiencyMetrics && efficiencyMetrics.data1 && efficiencyMetrics.data2) {
                //This is to store sepearate metrics data, to be able to plot easier
                const tokenizer1Metrics = efficiencyMetrics.data1.efficiency?.[language];

                const tokenizer2Metrics = efficiencyMetrics.data2.efficiency?.[language];

                const linguistic1 = linguisticMetrics?.data1?.linguistic?.[language];

                const linguistic2 = linguisticMetrics?.data2?.linguistic?.[language];

                if (tokenizer1Metrics && tokenizer2Metrics) {
                    //This is the scatter graph for compresion vs fertility and mapping value
                    setScatterData([
                        {
                            tokenizer: tokenizer1,
                            compression: tokenizer1Metrics.compression,
                            fertility: tokenizer1Metrics.fertility
                        },
                        {
                            tokenizer: tokenizer2,
                            compression: tokenizer2Metrics.compression,
                            fertility: tokenizer2Metrics.fertility
                        }
                    ]);
                    //This is the comparison row graph that compares each tokenizer metric against each other
                    setComparisonRows([
                        {
                            name: "Fertility",
                            value1: tokenizer1Metrics.fertility,
                            value2: tokenizer2Metrics.fertility
                        },
                        {
                            name: "Compression",
                            value1: tokenizer1Metrics.compression,
                            value2: tokenizer2Metrics.compression
                        },
                        {
                            name: "Token Length",
                            value1: tokenizer1Metrics.token_count,
                            value2: tokenizer2Metrics.token_count
                        },
                        {
                            name: "Precision",
                            value1: linguistic1?.precision,
                            value2: linguistic2?.precision
                        },
                        {
                            name: "Recall",
                            value1: linguistic1?.recall,
                            value2: linguistic2?.recall
                        },
                        {
                            name: "F1",
                            value1: linguistic1?.f1,
                            value2: linguistic2?.f1
                        }
                    ]);
                }
            }

        //shows which error occured
        } catch (error) {
            console.error(error);
        }
    }



    return (
        //Rendering part
        <div>
            <div className="compare-layout">
                
                {/*This is the div for the live tokenization*/}
                <div className="live-workspace-card">
                    <h2 className="workspace-title">Live Tokenization</h2>
                    <div>
                        {/*This is diaplay the tokenizer selected, if not selected, it shows not selected*/}
                        <h3 className="tokenizer-heading">{tokenizer1 || "Tokenizer 1 not selected"}</h3>
                        <div className="border p-4">
                            {/* This limits the displayed tokens to 50 cause they can fill up when uploading a file and maps each element to token*/}
                                
                            {tokenizedText1.slice(0, 50).map((token, index) => {
                                let displayToken = token;
                                return (

                                    <span key={index} className={`inline-block ${getTokenClass(token)} px-2 py-1 m-1 rounded`}
                                    >
                                        {displayToken}
                                    </span>
                                );
                            })}
                            <p className="mt-3 font-semibold">
                                Tokens: {tokenizedText1.length}
                            </p>
                        </div>
                        {/*This is diaplay the tokenizer selected, if not selected, it shows not selected*/}
                        <h3 className="tokenizer-heading" >{tokenizer2 || "Tokenizer 2 not selected"}</h3>

                            <div className="border p-4">
                                {/* This limits the displayed tokens to 50 cause they can fill up when uploading a file*/}
                                {tokenizedText2.slice(0, 50).map((token, index) => {

                                    let displayToken = token;

                                    return (
                                        <span
                                            key={index}
                                            className={`inline-block ${getTokenClass(token)} px-2 py-1 m-1 rounded`}
                                        >
                                            {displayToken}
                                        </span>
                                    );
                                })}
                                <p className="mt-3 font-semibold">
                                    Tokens: {tokenizedText2.length}
                                </p>
                            </div>
                    </div>
                    {/* This is the element the user enters text and is stored in inputText variable */}
                    <input type="text" id = "userText" placeholder="Enter text" className="w-full h-32 bg-white text-black border border-gray-400 rounded-md p-3 resize-none" value={inputText} onChange={(event) => setInputText(event.target.value)}
                    />

                    {/* button to uploading the file*/}
                    <input type="file" accept=".txt" onChange={uploadedFile} />
                    {fileError && (
                        <p className="text-red-600 mt-2">
                            {fileError}
                        </p>
                    )}
                    {/*Button for submiting a file*/}
                    <button onClick={submitFile} className="submit-button">
                    Submit File
                    </button>
                </div>
                
                <div className="tokenizer-container">
                    <div>{/* This is the drop down menu section for the component selecting tokenizer 1*/}
                        <label>Tokenizer 1: </label>
                        {/*This selects a tokenizer and stores it in the tokenizer 2*/}
                        <DropDown
                            options={tokenizers}
                            placeholder="Select first tokenizer"
                            action={(option) => setTokenizer1(option.target.value)}
                            />
                    </div>

                    <div> {/* This is the drop down menu section for the component selecting tokenizer 2*/}
                        <label>Tokenizer 2: </label>
                        {/*This selects a tokenizer and stores it in the tokenizer 2*/}
                        <DropDown
                            options={tokenizers}
                            placeholder="Select second tokenizer"
                            action={(option) => setTokenizer2(option.target.value)}
                        />
                    </div>
                    <div>{/* This is the drop down menu section for the component selecting language*/}
                        <label>Language: </label>
                        {/* This selectts a language and stores it in language*/}
                        <select value={language} onChange={(event) => setLanguage(event.target.value)} className="language-select">
                            <option value="">Select language</option>

                            {languages.map(([key, name]) => (
                                <option key={key} value={name}>
                                    {name}
                                </option>
                            ))}
                        </select>
                        {/*This  button starts the metric comparison and display process*/}
                        <button onClick={() => Submision("")} className="submit-button">
                            GET METRICS
                        </button>
                    </div>
                </div>
            
            </div>
                <div>{/*This is the metrics table, which is managed by the displaymetrics functionss*/}
                    <h2 className="text-2xl font-bold mb-4">
                        Results
                    </h2>
                <div className="results-container">
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
                    
        {/*This is the comparison card, its like a side ways bar graph in a way*/}
            <div className="comparison-card">

                <h2>Which vocabulary travels further?</h2>

                <p className="comparison-subtitle">
                    {tokenizer1 || "—"} vs {tokenizer2 || "—"}
                </p>
                
                {comparisonRows.map((metric) => {
                    // This is to get the metric values for Tokenizer 1 and Tokenizer 2
                    const value1 = metric.value1;
                    const value2 = metric.value2;
                    //This is to find the larger one between the two, so that the bar graph shows it
                    const maxValue = Math.max(value1 ?? 0, value2 ?? 0);
                    // This is to calculate the percentage width of Tokenizer 1's bar
                    const width1 =maxValue > 0 ? ((value1 ?? 0) / maxValue) * 100: 0;
                    // This is to calculate the percentage width of Tokenizer 2's bar, the highest will have the full bar
                    const width2 =maxValue > 0? ((value2 ?? 0) / maxValue) * 100: 0;

                    return (
                        <div className="comparison-metric" key={metric.name}>

                            <div className="comparison-label">

                                <span>{metric.name}</span>

                                <span>
                                    {value1?.toFixed(2) ?? "—"}
                                    {" vs "}
                                    {value2?.toFixed(2) ?? "—"}
                                </span>

                            </div>

                            <div className="comparison-bars">

                                <div
                                    className="comparison-bar orange"
                                    style={{ width: `${width1}%` }}
                                />

                                <div
                                    className="comparison-bar green"
                                    style={{ width: `${width2}%` }}
                                />

                            </div>

                        </div>
                    );
                })}

                <div className="comparison-legend">

                    <span className="orange-text">
                        ■ {tokenizer1 || "—"}
                    </span>

                    <span className="green-text">
                        ■ {tokenizer2 || "—"}
                    </span>

                </div>

            </div>
        </div>
        <div className="scatter-card">
    <h2>Fertility vs Compression</h2>

    <p className="scatter-subtitle">
        Comparing tokenizer efficiency
    </p>
    {/*This is the scatter graph */}
    <div className="scatter-chart">
        <ResponsiveContainer width="100%" height={350}>
            <ScatterChart>
                <CartesianGrid />

                <XAxis type="number" dataKey="compression" name="Compression" label={{ value: "Compression", position: "insideBottom" , dy: 20}}
                />

                <YAxis type="number" dataKey="fertility" name="Fertility" label={{ value: "Fertility", angle: -90,position: "insideLeft"}}
                />

                <Tooltip />

               <Legend verticalAlign="bottom" wrapperStyle={{ paddingTop: "20px" }}
            />

                <Scatter name={tokenizer1 || "Tokenizer 1"} data={scatterData.slice(0, 1)} fill="#ed6b5e"
                />

                <Scatter name={tokenizer2 || "Tokenizer 2"}  data={scatterData.slice(1, 2)} fill="#218775"
                />
            </ScatterChart>
        </ResponsiveContainer>
    </div>
</div>
        </div>
        

    </div>

        
    );
}