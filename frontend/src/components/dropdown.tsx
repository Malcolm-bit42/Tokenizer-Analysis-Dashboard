interface IDropDown {
    options: string[];

    action?: (value: any) => any;
    disbale?:boolean;
    placeholder?: string;
}

export const DropDown: React.FC<IDropDown> = ({
    options,
    action,
    placeholder = "Select an option",
    disbale=false
}) => {

    return (
        <>
            <div className={`text-[14px] flex flex-col gap-2 bg-panel text-muted rounded-lg max-w-[300px] outline-none px-[1rem] py-[.5rem] border-[0.1px] border-[#ddd] ${disbale ? "opacity-50 curosr-default pointer-events-none" : "opacity-100 cursor-pointer pointer-events-auto"}`} >
                <label className=" section-label">{placeholder}</label>

                <select className="w-full outline-none text-charcoal font-bold" onChange={action}>
                    {
                        options.map((option, index: number) => (
                            <option value={option} key={index} >
                                {option}
                            </option>
                        ))
                    }
                </select>
            </div>

        </>
    );
};
