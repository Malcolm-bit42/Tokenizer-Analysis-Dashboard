import React from "react";


interface IButton {
    fill?: "bg-panel" | "bg-charcoal" | "bg-canvas" | "bg-muted" | "bg-soft-border" | "bg-strong-border";
    color?: "text-panel" | "text-charcoal" | "text-canvas" | "text-muted" | "text-soft-border" | "text-strong-border";
    text: string;
    action: (e: any) => any;
    icon?: string | any;
    disabled?: boolean;
}


export const Button: React.FC<IButton> = ({ fill = "bg-charcoal", color = "text-panel", text, action, icon, disabled=false }) => {
    return (
        <>
            <button className={`${fill} ${color} flex items-center gap-2 font-bold rounded-3xl border-solid px-[1rem] py-[.75rem] text-[13px] cursor-pointer `} onClick={action} disabled={disabled}>
                {icon && icon}
                {text}
            </button>
        </>
    )
}