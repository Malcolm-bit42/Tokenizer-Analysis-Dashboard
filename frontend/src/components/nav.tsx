import { Link, useNavigate } from "react-router-dom";
import { Button } from "./button";
import { getModelSummary } from "../api/api";

export const Nav = (path?: any) => {
    // console.log("path from nav: " + path)

    const downloadData = async () => {
        // download metrics summary as json file
        try {
         
            const data = await getModelSummary();
            

            const jsonData = JSON.stringify(data, null, 2);

            const blob = new Blob([jsonData], { type: "application/json" });

            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = "precomputed_metrics.json";

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href); 
        } catch (error) {
            console.error("Failed to download metrics: " + error);
        }

    }

    const naviagte = useNavigate();
    return (
        <nav className="flex sticky top-0 bg-canvas z-[9999] justify-between items-center py-2 text-sm border-b-[.1px] border-b-[#bbb] px-30">
            <section className="flex gap-5 text-muted items-center">
                <img src="/ttad.png" className="w-[35px] h-[35px] cursor-pointer" onClick={() => naviagte("/")} />
                <Link to={"/"} className={`${ path.path === "/" ? "before:w-[35px]" : null} px-4 py-2  rounded-sm before:content-["] relative before:absolute before:bottom-[5px] before:h-[2.5px] before:w-[7.5px] before:bg-good hover:before:w-[35px] before:transition-all`}>
                    Inspect
                </Link>
                <Link to={"/compare"} className={`${ path.path === "/compare" ? "before:w-[35px]" : null} px-4 py-2 before:content-["] relative before:absolute before:bottom-[5px] before:h-[2.5px] before:w-[7.5px] before:bg-bad hover:before:w-[35px] before:transition-all rounded-sm`}>
                    Compare
                </Link>
                <Link to={"/leaderboard"} className={`${ path.path === "/leaderboard" ? "before:w-[35px]" : null} px-4 py-2 before:content-["] relative before:absolute before:bottom-[5px] before:h-[2.5px] before:w-[7.5px] before:bg-info hover:before:w-[35px] before:transition-all rounded-sm`}>
                    LeaderBoard
                </Link>

            </section>
            <section>
                <Button text="Download Metrics" action={downloadData} />
            </section>
        </nav>
    )
}