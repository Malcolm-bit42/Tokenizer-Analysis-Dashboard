import { Link } from "react-router-dom";

export default function NotFound() {
    return (
        <div className="w-full h-screen justify-center items-center flex">
            <h1 className="section-label text-center !text-[1rem]">
                404 Page Not Found. Go back <Link to={"/"} className="underline">home</Link>.
            </h1>
        </div>
    )
}