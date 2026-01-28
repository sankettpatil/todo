"use client";

import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface SnackbarProps {
    message: string;
    type?: 'created' | 'edited' | 'deleted' | 'error' | 'info';
    onClose: () => void;
}

export default function Snackbar({ message, type = 'created', onClose }: SnackbarProps) {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, 5000); // Extended to 5 seconds

        return () => clearTimeout(timer);
    }, [onClose]);

    const bgColor =
        type === 'created' ? 'bg-green-500/20' :
            type === 'edited' ? 'bg-yellow-500/20' :
                type === 'deleted' ? 'bg-red-500/20' :
                    type === 'error' ? 'bg-red-500/20' :
                        'bg-blue-500/20';

    const borderColor =
        type === 'created' ? 'border-green-400/40' :
            type === 'edited' ? 'border-yellow-400/40' :
                type === 'deleted' ? 'border-red-400/40' :
                    type === 'error' ? 'border-red-400/40' :
                        'border-blue-400/40';

    const textColor =
        type === 'created' ? 'text-green-300' :
            type === 'edited' ? 'text-yellow-300' :
                type === 'deleted' ? 'text-red-300' :
                    type === 'error' ? 'text-red-300' :
                        'text-blue-300';

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
