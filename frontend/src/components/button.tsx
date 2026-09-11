import React from "react";


interface IButton {
    fill?: "bg-panel" | "bg-charcoal" | "bg-canvas" | "bg-muted" | "bg-soft-border" | "bg-strong-border";
    color?: "text-panel" | "text-charcoal" | "text-canvas" | "text-muted" | "text-soft-border" | "text-strong-border";
    text: string;
    action: (e: any) => any;
    icon?: string | any;
    disabled?: boolean;
    className?: string;
}


export const Button: React.FC<IButton> = ({ fill = "bg-charcoal", color = "text-panel", text, action, icon, disabled=false, className="" }) => {
    return (
        <>
            <button className={`${disabled ? "opacity-50": null} ${fill} ${color} flex items-center text-nowrap gap-2 font-bold rounded-3xl border-solid px-[1rem] py-[.75rem] text-[13px] cursor-pointer ` + className} onClick={action} >
                {icon && icon}
                {text}
            </button>
        </>
    )
}