"use client";

import React from 'react';

interface TooltipProps {
    text: string;
    children: React.ReactNode;
}

export default function Tooltip({ text, children }: TooltipProps) {
    return (
        <div className="relative group inline-block">
            {children}
            <div className="
                absolute bottom-full left-1/2 -translate-x-1/2 mb-2
                px-3 py-1.5 rounded-lg
                bg-black/90 text-white text-xs font-medium
                opacity-0 invisible group-hover:opacity-100 group-hover:visible
                transition-all duration-200
                whitespace-nowrap
                pointer-events-none
                z-50
            ">
                {text}
                <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-[1px] w-2 h-2 bg-black/90 rotate-45"></div>
            </div>
        </div>
    );
}
