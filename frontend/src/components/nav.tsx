import { Link, useNavigate } from "react-router-dom";
import { Button } from "./button";

export const Nav = (path?: any) => {
    // console.log("path from nav: " + path)
    const naviagte = useNavigate();
    return (
        <nav className="flex justify-between items-center py-2 text-sm border-b-[.1px] border-b-[#bbb] px-30">
            <section className="flex gap-5 text-muted items-center">
                <img src="/ttad.png" className="w-[35px] h-[35px] cursor-pointer" onClick={() => naviagte("/")} />
                <Link to={"/"} className={`${ path.path === "/" ? "bg-[#EBE9E4]" : null} px-4 py-2 hover:bg-[#EBE9E4] rounded-sm`}>
                    Inspect
                </Link>
                <Link to={"/compare"} className={`${ path.path === "/compare" ? "bg-[#EBE9E4]" : null} px-4 py-2 hover:bg-[#EBE9E4] rounded-sm`}>
                    Compare
                </Link>
                <Link to={"/leaderboard"} className={`${ path.path === "/leaderboard" ? "bg-[#EBE9E4]" : null} px-4 py-2 hover:bg-[#EBE9E4] rounded-sm`}>
                    LeaderBoard
                </Link>

            </section>
            <section>
                <Button text="Download Metrics" action={() => alert("Metrics Downlaoded")} />
            </section>
        </nav>
    )
}