export const LeaderBoardSkeleton = () => {
    return (
        <section className="w-full">
            {/* The part with the language and metrics dropdown */}
            <div className="flex justify-between bg-[#EBE9E4] p-3 rounded-lg mb-10">
                <div className="gap-3 flex">
                    <div className="rounded-lg w-full max-w-[400px] outline-none px-[1rem] py-5 skeleton"></div>
                    {/* <div className="rounded-lg w-full max-w-[200px] outline-none px-[1rem] py-5 skeleton"></div> */}
                    <div className="rounded-3xl  px-[1rem] py-5 skeleton w-[200px]"></div>
                </div>

                <div className="flex gap-4 items-center">
                    {/* Be able to toggle between ranking by language and ranking by tokenizers */}
                    <div className="skeleton !w-[100px] h-[15px]"></div>
                    <div className={"w-[70px] skeleton h-[28px] rounded-pill"}></div>
                </div>

            </div>


            {/* The metric selection buttons */}
            <div className="flex gap-5 mb-10">
                    {
                        Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="skeleton !px[.5rem] !py-[.5rem] w-full max-w-[120px] h-[35px] !rounded-[9999px]"></div>
                        ))
                    }
            </div>


            {/* The dummy table */}
            <div className="w-full border-[.1px] border-[#ddd] mb-10 h-[50vh] skeleton"></div>
        </section>
    )

}