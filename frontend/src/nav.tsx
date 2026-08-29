import { Link } from "react-router-dom";
import { Button } from "./components/button";

export const Nav = () => {
    return (
        <nav className="flex justify-between items-center px-[4rem] py-2 text-sm border-b-[.1px] border-b-[#bbb]">
            <section className="flex gap-5 text-muted">
                <Link to={"/"}>
                    Inspect
                </Link>
                <Link to={"/compare"}>
                    Compare
                </Link>
                <Link to={"/leaderboard"}>
                    LeaderBoard
                </Link>

            </section>
            <section>
                <Button text="Download Metrics" action={() => alert("Metrics Downlaoded")} />
            </section>
        </nav>
    )
}