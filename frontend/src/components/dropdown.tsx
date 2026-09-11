import { useState, useRef, useEffect } from "react";

interface IDropDown {
    options: string[];

    action?: (value: any) => any;
    disbale?:boolean;
    placeholder?: string;
    pureSearch?: boolean;
}

export const DropDown: React.FC<IDropDown> = ({ options, action,placeholder = "Select an option",disbale = false,pureSearch = false }) => {
    const [inputValue, setInputValue] = useState<string>("");
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [filteredOptions, setFilteredOptions] = useState<string[]>(options);
    const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Sync filtered options when the options prop changes
    useEffect(() => {
        if (inputValue === "") {
            setFilteredOptions(options);
        } else {
            filterOptions(inputValue);
        }
    }, [options]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) handleClose();
        };

        document.addEventListener("mousedown", handleClickOutside);

        return () => document.removeEventListener("mousedown", handleClickOutside);

    }, [inputValue, pureSearch]);

    const filterOptions = (query: string) => {
        if (query.trim() === "") {
            setFilteredOptions(options);
            return;
        }

        try {
            // Escape special regex chars in the query, then build a case-insensitive pattern
            const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            const regex = new RegExp(escaped, "i");
            const matches = options.filter((opt) => regex.test(opt));

            // Sort: options that START with the query come first
            matches.sort((a, b) => {
                const aStarts = a.toLowerCase().startsWith(query.toLowerCase());
                const bStarts = b.toLowerCase().startsWith(query.toLowerCase());
                if (aStarts && !bStarts) return -1;
                if (!aStarts && bStarts) return 1;
                return a.localeCompare(b);
            });

            setFilteredOptions(matches);

        } catch {
            // If regex somehow fails, fall back to simple includes
            setFilteredOptions(options.filter((opt) => opt.toLowerCase().includes(query.toLowerCase())));
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setInputValue(value);
        filterOptions(value);
        setHighlightedIndex(-1);
        setIsOpen(true);
    };

    const selectOption = (option: string) => {
        setInputValue(option);
        setIsOpen(false);
        setHighlightedIndex(-1);

        // Fire the action callback with a synthetic-ish event shape
        if (action) action({ target: { value: option } });

    };

    const handleClose = () => {
        setIsOpen(false);
        setHighlightedIndex(-1);

        const trimmed = inputValue.trim();

        if (trimmed === "") return;

        // Check if current input matches an existing option exactly
        const exactMatch = options.find((opt) => opt.toLowerCase() === trimmed.toLowerCase());
        if (exactMatch) {
            selectOption(exactMatch);
            return;
        }

        if (pureSearch) {
            // Pure search mode: revert to empty if no match
            setInputValue("");
        } else {
            // Allow custom text as the value
            if (action) action({ target: { value: trimmed } });
        }
    };

    // const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        
    //     if (!isOpen && e.key !== "Escape") setIsOpen(true);


    //     switch (e.key) {
    //         case "ArrowDown":
    //             e.preventDefault();
    //             setHighlightedIndex((prev) =>
    //                 prev < filteredOptions.length - 1 ? prev + 1 : 0
    //             );
    //             break;
    //         case "ArrowUp":
    //             e.preventDefault();
    //             setHighlightedIndex((prev) =>
    //                 prev > 0 ? prev - 1 : filteredOptions.length - 1
    //             );
    //             break;
    //         case "Enter":
    //             e.preventDefault();
    //             if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
    //                 selectOption(filteredOptions[highlightedIndex]);
    //             } else if (filteredOptions.length > 0) {
    //                 // Auto-select the top match
    //                 selectOption(filteredOptions[0]);
    //             } else if (!pureSearch && inputValue.trim()) {
    //                 // No matches + not pure search → use custom text
    //                 handleClose();
    //             }
    //             break;
    //         case "Escape":
    //             setIsOpen(false);
    //             setHighlightedIndex(-1);
    //             inputRef.current?.blur();
    //             break;
    //     }
    // };

    return (
        <div ref={containerRef} className={`relative text-[14px] flex flex-col gap-2 bg-panel text-muted rounded-lg w-full max-w-[400px] outline-none px-[1rem] py-[.5rem] border-[0.1px] border-[#ddd] ${disbale ? "opacity-50 cursor-default pointer-events-none" : "opacity-100 cursor-pointer pointer-events-auto"}`}>
            <label className="section-label">{placeholder}</label>

            <input ref={inputRef} type="text" value={inputValue} onChange={handleInputChange} onFocus={() => setIsOpen(true)} placeholder="Type to search..." className="w-full outline-none text-charcoal font-bold bg-transparent" autoComplete="off"/>

            {isOpen && filteredOptions.length > 0 && (
                <ul className="absolute left-0 top-full mt-1 w-full max-h-[200px] overflow-y-auto bg-panel border-[0.1px] border-[#ddd] rounded-lg shadow-lg z-50">
                    {filteredOptions.map((option, index) => (
                        <li key={`${option}-${index}`}
                            onMouseDown={(e) => {
                                e.preventDefault();
                                selectOption(option);
                            }}
                            onMouseEnter={() => setHighlightedIndex(index)}
                            className={`px-[1rem] py-[.5rem] cursor-pointer text-charcoal text-[13px] transition-colors ${index === highlightedIndex? "bg-[#e0ddd8] font-bold": "hover:bg-[#eae8e3]"}`}>
                            {option}
                        </li>
                    ))}
                </ul>
            )}

            {isOpen && filteredOptions.length === 0 && inputValue.trim() !== "" && (
                <div className="absolute left-0 top-full mt-1 w-full bg-panel border-[0.1px] border-[#ddd] rounded-lg shadow-lg z-50 px-[1rem] py-[.6rem] text-[13px] text-muted">
                    {pureSearch? "No matches found": <span>No matches — press <kbd className="font-bold text-charcoal">Enter</kbd> to use "<span className="font-bold text-charcoal">{inputValue}</span>"</span>}
                </div>
            )}
        </div>
    );
};
