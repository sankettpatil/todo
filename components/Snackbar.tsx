"use client";

import React, { useEffect } from 'react';
import { X, CheckCircle2, Edit2, Trash2, AlertCircle, Info } from 'lucide-react';

interface SnackbarProps {
    message: string;
    type?: 'created' | 'edited' | 'deleted' | 'error' | 'info' | 'success';
    onClose: () => void;
}

export default function Snackbar({ message, type = 'created', onClose }: SnackbarProps) {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, 5000); // Extended to 5 seconds

        return () => clearTimeout(timer);
    }, [onClose]);

    const currentType = type || 'info';

    const styles = {
        created: { bg: 'bg-green-500/10', border: 'border-green-500/20', text: 'text-green-400', icon: <CheckCircle2 size={18} /> },
        success: { bg: 'bg-green-500/10', border: 'border-green-500/20', text: 'text-green-400', icon: <CheckCircle2 size={18} /> },
        edited: { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-400', icon: <Edit2 size={18} /> },
        deleted: { bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-300', icon: <Trash2 size={18} /> },
        error: { bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-300', icon: <AlertCircle size={18} /> },
        info: { bg: 'bg-purple-500/10', border: 'border-purple-500/20', text: 'text-purple-400', icon: <Info size={18} /> }
    };

    const style = styles[currentType] || styles.info;

    return (
        <div className={`
            fixed bottom-6 left-1/2 -translate-x-1/2 z-50
            flex items-center gap-3 px-4 py-3 rounded-xl
            backdrop-blur-xl shadow-2xl
            border active:scale-95 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4
            ${style.bg} ${style.border} ${style.text}
        `}>
            {style.icon}
            <span className="font-medium text-sm whitespace-nowrap">{message}</span>
            <button
                onClick={onClose}
                className={`p-1 rounded-full hover:bg-white/10 transition-colors ${style.text}`}
            >
                <X size={14} />
            </button>
        </div>
    );
}
