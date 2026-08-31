import { Button } from "./button";
import { Document } from "./icons/document";
import { Dot } from "./icons/dot";
import { Star } from "./icons/star";

interface IHero {
    pageName: string;
}
export const Hero: React.FC<IHero> = ({ pageName }) => {
    return (
        <>
            <section className="flex items-end justify-between my-20 gap-10">

                <div className="flex flex-col gap-7 justify-between items-start w-[50%]">
                    <p className="section-label flex items-center gap-2">
                      <Dot color="#e45a3b"/>  South African language benchmark · {new Date().getFullYear()}
                    </p>

                    <div className="flex flex-col text-6xl md:text-7xl font-black tracking-tighter leading-[1.05]">
                        <h1 className="text-charcoal">Tokeniser</h1>
                        <h1 className="text-muted">{pageName}</h1>
                    </div>

                    <p className="text-sm font text-muted pr-10">
                        Understand how language models see the world. Compare tokenization efficiency, morphology, and representation quality across under-resourced languages.
                    </p>
                </div>


                <div className="flex items-end gap-5 w-[50%] h-full">
                    <Button text="Run Analysis" action={() => alert("Analysing data")} icon={<Star />}/>
                    <Button text="Methodology" action={() => alert("Analysing data")} fill="bg-panel" color="text-charcoal" icon={<Document />}/>
                </div>

            </section>
        </>
    )
}