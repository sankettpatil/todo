"use client";

import React, { useState } from 'react';

interface TooltipProps {
    text: string;
    children: React.ReactNode;
    position?: 'top' | 'bottom' | 'left' | 'right';
}

export default function Tooltip({ text, children, position = 'top' }: TooltipProps) {
    const [isHovered, setIsHovered] = useState(false);
    const [showOnTouch, setShowOnTouch] = useState(false);

    const handleMouseEnter = () => setIsHovered(true);
    const handleMouseLeave = () => setIsHovered(false);

    const handleTouchStart = (e: React.TouchEvent) => {
        e.stopPropagation();
        setShowOnTouch(true);
        setTimeout(() => setShowOnTouch(false), 1500);
    };

    const show = isHovered || showOnTouch;

    const positionClasses = {
        top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
        bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
        left: 'right-full top-1/2 -translate-y-1/2 mr-2',
        right: 'left-full top-1/2 -translate-y-1/2 ml-2'
    };

    const arrowClasses = {
        top: 'top-full left-1/2 -translate-x-1/2 -mt-[1px]',
        bottom: 'bottom-full left-1/2 -translate-x-1/2 -mb-[1px]',
        left: 'left-full top-1/2 -translate-y-1/2 -ml-[1px]',
        right: 'right-full top-1/2 -translate-y-1/2 -mr-[1px]'
    };

    return (
        <div
            className="relative inline-flex"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onTouchStart={handleTouchStart}
        >
            {children}
            {show && (
                <div className={`absolute ${positionClasses[position]} px-3 py-1.5 rounded-lg bg-black/90 text-white text-xs font-medium whitespace-nowrap pointer-events-none z-50 animate-in fade-in duration-200`}>
                    {text}
                    <div className={`absolute w-2 h-2 bg-black/90 rotate-45 ${arrowClasses[position]}`}></div>
                </div>
            )}
        </div>
    );
}
