//   --color-good: #22a06b;
//   --color-bad: #e45a3b;
//   --color-warn: #d97706;
//   --color-info: #2563eb;

interface IDot {
    color?: "#22a06b" | "#e45a3b" | "#d97706" | "#2563eb" | string;
}

export const Dot: React.FC<IDot> = ({ color = "#22a06b"}) => {
    return (
        <>
            <span style={{ backgroundColor: color}} className="w-[5px] h-[5px] rounded-full"></span>
        </>
    )
}