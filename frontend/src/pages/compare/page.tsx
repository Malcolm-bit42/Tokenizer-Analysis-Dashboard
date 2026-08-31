import { useEffect, useState } from "react";
import { getLanguages, getTokenizers } from "../../api/api";
import { tokeniseText } from "../../api/api"
import { getMetrics } from "../../api/api"
import type { languages_t, metric_t } from "../../utils/types";
import "./style.css";


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

    //This is to remove selected file, it wont show it was removed on the page, but it is, will work on the UI in the future
    function removeFile() {
        setFileText("");
    }

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
        
        //stores the text into a variable
        console.log(cleanedText);
        setFileText(cleanedText)
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

    // This gets the elements of the efficiency metrics from the table and maps their values
    function displayLinguisticMetrics(metrics: any) {

            //the metrics are extracted from the backend retrieval form getmetrics
        const tokenizer1Metrics = metrics.data1.linguistic[language];
        const tokenizer2Metrics = metrics.data2.linguistic[language];

        //Since some languages dont have linguistic metrics like english, i this makes sures the values in the table are empy if the language doesnt have them
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
                tokenizer2Metrics.precision?.toFixed(2) ?? "-";

            document.getElementById("recall2")!.textContent =
                tokenizer2Metrics.recall?.toFixed(2) ?? "-";

            document.getElementById("f1Score2")!.textContent =
                tokenizer2Metrics.f1?.toFixed(2) ?? "";
        } else {
            document.getElementById("precision2")!.textContent = "-";
            document.getElementById("recall2")!.textContent = "-";
            document.getElementById("f1Score2")!.textContent = "-";
        }
    }
        
    //This functions basically kickstarts everything, when they user presses the submit button
    async function Submision() {

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
            let text;
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

            
            //If the file is not  empty use the data on the file as prioty over the enter text space, if there is nofile and no input text, then a default sentence starts

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
            //This gets the tokenised text from backend using the text data 
            const tokenisedData = await getTokenizedText( tokenizer1,tokenizer2, text)
            console.log(efficiencyMetrics);
            console.log(linguisticMetrics);
            console.log(tokenisedData)
            setTokenizedText1(tokenisedData.data1.tokens);
            setTokenizedText2(tokenisedData.data2.tokens);
        //shows which error occured
        } catch (error) {
            console.error(error);
        }
    }



    return (
        //Rendering part
        <div>
            <h1>Compare Tokenizers</h1>
            <div style={{ display: "flex" }}>
                <div>
                    <div>
                        <h3>{tokenizer1}</h3>
                        <div className="border p-4">
                            {/* This limits the displayed tokens to 50 cause they can fill up when uploading a file and maps each element to token*/}
                                
                            {tokenizedText1.slice(0, 50).map((token, index) => {
                                let displayToken = token;
                                {/* This removes the special character on the display from the side effect of tokenization*/}
                                
                                if (displayToken.startsWith("##")) {
                                    displayToken = displayToken.substring(2);
                                }
                                if (displayToken.startsWith("Ġ") || displayToken.startsWith("▁") ) {
                                    displayToken = displayToken.substring(1);
                                }

                                return (

                                    <span key={index} className={`inline-block ${getTokenClass(token)} px-2 py-1 m-1 rounded`}
                                    >
                                        {displayToken}
                                    </span>
                                );
                            })}
                        </div>
                        
                        <h3>{tokenizer2}</h3>

                            <div className="border p-4">
                                {/* This limits the displayed tokens to 50 cause they can fill up when uploading a file*/}
                                {tokenizedText2.slice(0, 50).map((token, index) => {

                                    let displayToken = token;

                                    {/* This removes the special character on the display from the side effect of tokenization*/}
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
                    {/* This is the element the user enters text and is stored in inputText variable */}
                    <input type="text" id = "userText" placeholder="Enter text" className="w-full h-32 bg-white text-black border border-gray-400 rounded-md p-3 resize-none" value={inputText} onChange={(event) => setInputText(event.target.value)}
                    />
                    {/*This is where the user submits by pressing the button calling upon the submison function*/}
                    <button onClick={() => Submision()} className="submit-button" > Submit</button>
                    {/* button to uploading the file*/}
                    <input type="file" accept=".txt" onChange={uploadedFile} />
                    {/* button to removing the file calling uppon the remove file functon*/}
                    <button type="button" onClick={removeFile}>
                        Remove File
                    </button>
                </div>
                <div className="tokenizer-container">
                    <div>{/* This is the drop down menu section for the component selecting tokenizer 1*/}
                        <label>Tokenizer 1: </label>
                        {/*This selects a tokenizer and stores it in the tokenizer 2*/}
                        <select value={tokenizer1} onChange={(event) => setTokenizer1(event.target.value)} className="tokenizer-select">
                            <option value="">Select a tokenizer</option>

                            {tokenizers.map((tokenizer) => (
                                <option key={tokenizer} value={tokenizer}>
                                    {tokenizer}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div> {/* This is the drop down menu section for the component selecting tokenizer 2*/}
                        <label>Tokenizer 2: </label>
                        {/*This selects a tokenizer and stores it in the tokenizer 2*/}
                        <select value={tokenizer2} onChange={(event) => setTokenizer2(event.target.value)} className="tokenizer-select">
                            <option value="">Select a tokenizer</option>

                            {tokenizers.map((tokenizer) => (
                                <option key={tokenizer} value={tokenizer}>
                                    {tokenizer}
                                </option>
                            ))}
                        </select>
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
                    </div>
                </div>
            
            </div>
                <div>{/*This is the metrics table, which is managed by the displaymetrics functionss*/}
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