"use client";

import React, { useEffect } from 'react';
import { Check, X } from 'lucide-react';

interface SnackbarProps {
    message: string;
    type?: 'success' | 'error' | 'info';
    onClose: () => void;
}

export default function Snackbar({ message, type = 'success', onClose }: SnackbarProps) {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, 3000);

        return () => clearTimeout(timer);
    }, [onClose]);

    const bgColor = type === 'success' ? 'bg-green-500/20' : type === 'error' ? 'bg-red-500/20' : 'bg-blue-500/20';
    const borderColor = type === 'success' ? 'border-green-400/40' : type === 'error' ? 'border-red-400/40' : 'border-blue-400/40';
    const textColor = type === 'success' ? 'text-green-300' : type === 'error' ? 'text-red-300' : 'text-blue-300';
    const Icon = type === 'success' ? Check : X;

    return (
        <div className={`
            fixed top-8 left-1/2 -translate-x-1/2 z-50
            ${bgColor} ${borderColor} ${textColor}
            backdrop-blur-xl border
            rounded-2xl px-6 py-4
            shadow-2xl
            flex items-center gap-3
            animate-slide-up
        `}>
            <Icon size={20} className="flex-shrink-0" />
            <span className="font-semibold">{message}</span>
            <button
                onClick={onClose}
                className="ml-2 opacity-60 hover:opacity-100 transition-opacity"
            >
                <X size={16} />
            </button>
        </div>
    );
}
