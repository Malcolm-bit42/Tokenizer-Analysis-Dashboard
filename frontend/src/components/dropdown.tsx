interface IDropDown {
    options: string[];

    action?: (value: any) => any;

    placeholder?: string;
}

export const DropDown: React.FC<IDropDown> = ({
    options,
    action,
    placeholder = "Select an option",
}) => {

    return (
        <>
            <div className="text-[14px] flex flex-col gap-2 bg-panel text-muted rounded-lg max-w-[300px] outline-none px-[1rem] py-[.5rem] border-[0.1px] border-[#ddd]" >
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
