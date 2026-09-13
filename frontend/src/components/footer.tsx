import { Link } from "react-router-dom"
import { Dot } from "./icons/dot"

export const Footer: React.FC = () => {
    return (
        <footer className="flex w-full my-10 text-center text-[12px] section-label font-bold !text-[#000] items-center justify-center gap-2">
            <Dot /> <span>Copyright &copy; {new Date().getFullYear()} <Link to={"https://gitlab.cs.uct.ac.za/rvhzwi001/tad-capstone"} className="underline" target="_blank">The Boys</Link>. All rights reserved (Prolly Not).</span>
        </footer>
    )
}