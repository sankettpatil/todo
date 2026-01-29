"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Settings, Plus, Type, PenLine, Image as ImageIcon, X, Check, Circle, CheckCircle2, Trash2, GripVertical, Pin } from 'lucide-react';
import Tooltip from './Tooltip';

interface NoteProps {
    id: number;
    title: string;
    description?: string;
    points: string[];
    created_at?: number;
    updated_at?: number;
    color?: string;
    tags?: string[];
    pinned?: boolean; // Whether note is pinned
    pin_order?: number; // Pin order (1-3)
    onDelete: (id: number) => void;
    onUpdate: (id: number, updates: { title?: string, description?: string, points?: string[] }) => void;
    onPin: (id: number) => void; // Pin/unpin callback
    onComplete?: (id: number) => void; // Completion callback
    // Drag and drop
    draggable?: boolean;
    onDragStart?: (e: React.DragEvent, id: number) => void;
    onDragOver?: (e: React.DragEvent, id: number) => void;
    onDragEnd?: () => void;
    onDrop?: (e: React.DragEvent, id: number) => void;
    isDragging?: boolean;
    isDragOver?: boolean;
}

export default function StickyNote({
    id, title, description, points, created_at, updated_at, color, tags, pinned = false, pin_order,
    onDelete, onUpdate, onPin, onComplete,
    draggable = true, onDragStart, onDragOver, onDragEnd, onDrop, isDragging = false, isDragOver = false
}: NoteProps) {
    const [isAdding, setIsAdding] = useState(false);
    const [newPoint, setNewPoint] = useState('');

    // Interaction States

    const [isEditing, setIsEditing] = useState(false);

    // Edit Mode States
    const [editTitle, setEditTitle] = useState(title);
    const [editDescription, setEditDescription] = useState(description || '');
    const [editPoints, setEditPoints] = useState<string[]>(points);

    // File Input Ref
    const fileInputRef = useRef<HTMLInputElement>(null);
    const addInputRef = useRef<HTMLInputElement>(null);

    // Sync state when props change
    useEffect(() => {
        if (!isEditing) {
            setEditTitle(title);
            setEditDescription(description || '');
            setEditPoints(points);
        }
    }, [title, description, points, isEditing]);

    const handleAddPoint = (text: string) => {
        if (!text.trim()) return;
        onUpdate(id, { points: [...points, text] });
        setNewPoint('');
        setIsAdding(true); // Keep adding mode open
        // Defer focus to allow render cycle to complete if needed, though usually sync in React 18+ for this
        setTimeout(() => addInputRef.current?.focus(), 10);
    };

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        handleAddPoint(newPoint);
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                handleAddPoint(`data:image_block:${base64String}`);
            };
            reader.readAsDataURL(file);
        }
    };

    const triggerImageUpload = () => {
        fileInputRef.current?.click();
    };

    const handleTypeClick = () => {
        const headingText = prompt("Enter Heading Text:");
        if (headingText) {
            handleAddPoint(`H:${headingText}`);
        }
    };

    const saveEdits = () => {
        onUpdate(id, {
            title: editTitle,
            description: editDescription,
            points: editPoints
        });
        setIsEditing(false);
    };

    const toggleTaskDone = (index: number) => {
        if (isEditing) return; // Disable toggling while editing to avoid confusion
        const point = points[index];
        let newPointStr = '';
        if (point.startsWith('DONE:')) {
            newPointStr = point.replace('DONE:', '');
        } else {
            newPointStr = `DONE:${point}`;
        }

        const newPoints = [...points];
        newPoints[index] = newPointStr;

        // Check if all tasks are now completed (excluding images and headings)
        const actualTasks = newPoints.filter(p => !p.startsWith('data:image_block:') && !p.startsWith('H:'));
        const allTasksCompleted = actualTasks.length > 0 && actualTasks.every(p => p.startsWith('DONE:'));

        if (allTasksCompleted) {
            // Track completion stats if handler provided
            onComplete?.(id);

            // Auto-delete the note after a brief delay to show the completion animation
            setTimeout(() => {
                onDelete(id);
            }, 500);
        }

        // We do NOT sort here locally; we send update to backend, which saves it. 
        // The re-render will handle sorting if we implement sorting logic in the render block.
        onUpdate(id, { points: newPoints });
    };

    // Helper to check if point is done
    const isDone = (p: string) => p.startsWith('DONE:');
    const getCleanText = (p: string) => p.replace('DONE:', '');

    // Sort logic for display: Not Done first, then Done
    const sortedIndices = points.map((_, i) => i).sort((a, b) => {
        const aDone = isDone(points[a]);
        const bDone = isDone(points[b]);
        if (aDone === bDone) return a - b; // Keep original order if same status
        return aDone ? 1 : -1; // Done items go to bottom (1)
    });


    const updateEditPoint = (idx: number, val: string) => {
        const newPts = [...editPoints];
        newPts[idx] = val;
        setEditPoints(newPts);
    };

    // Format Date
    const displayTimestamp = updated_at || created_at;
    const isEdited = updated_at && created_at && updated_at > created_at;

    const dateStr = displayTimestamp ? new Date(displayTimestamp * 1000).toLocaleString('en-US', {
        month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
    }) : '';

    return (
        <div className={`
      group relative w-full
      rounded-2xl md:rounded-3xl
      ${color || 'bg-[#1c1c1e]/80'} 
      backdrop-blur-2xl
      border border-white/10
      shadow-xl
      transition-all duration-300
      hover:-translate-y-1 hover:shadow-2xl
      flex flex-col
      ${draggable ? 'cursor-grab active:cursor-grabbing' : ''}
      ${isDragging ? 'opacity-40 scale-95' : 'opacity-100'}
      ${isDragOver ? 'ring-2 ring-blue-400/50' : ''}
    `}
            draggable={draggable}
            onDragStart={(e) => onDragStart?.(e, id)}
            onDragOver={(e) => onDragOver?.(e, id)}
            onDragEnd={() => onDragEnd?.()}
            onDrop={(e) => onDrop?.(e, id)}
        >
            {/* Header */}
            <div className="relative flex items-start justify-between p-3 md:p-6 pb-2 md:pb-4 border-b border-white/5">
                <div className="flex flex-col min-w-0 flex-1 mr-4">
                    {isEditing ? (
                        <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="w-full bg-transparent border-none text-lg md:text-2xl font-bold text-white focus:outline-none placeholder:text-white/30 -ml-0.5"
                            placeholder="Title..."
                        />
                    ) : (
                        <h3 className="text-lg md:text-2xl font-bold text-white tracking-tight truncate pr-2">
                            {title}
                        </h3>
                    )}
                </div>

                <div className="flex flex-col items-end gap-1">
                    <Tooltip text="Drag to reorder">
                        <button
                            className="text-white/20 hover:text-white/80 transition-colors opacity-0 group-hover:opacity-100 p-2 md:p-1 rounded-lg min-h-[44px] md:min-h-0 min-w-[44px] md:min-w-0 flex items-center justify-center cursor-grab active:cursor-grabbing"
                        >
                            <GripVertical size={20} />
                        </button>
                    </Tooltip>
                </div>

                {/* Timestamp at border line - ORIGINAL DESIGN RESTORED */}
                {dateStr && !isEditing && (
                    <div className="absolute -bottom-2.5 right-3 md:right-6 bg-[#1c1c1e] px-1 md:px-2 flex items-center gap-1 md:gap-2">
                        <span className="text-[8px] md:text-[10px] uppercase tracking-wider text-white/30 font-semibold">
                            {dateStr}
                        </span>
                        {isEdited && <span className="text-[8px] md:text-[10px] text-orange-400/60 font-bold uppercase tracking-wide">Edited</span>}
                    </div>
                )}

            </div>

            {/* Content */}
            <div className="px-3 py-3 md:px-6 md:py-6 space-y-3 md:space-y-6 flex-1">
                {/* Description - Only show in view mode */}
                {!isEditing && description && (
                    <p className="text-sm md:text-base text-white/70 leading-relaxed font-normal">
                        {description}
                    </p>
                )}

                {/* Points */}
                {(points.length > 0 || isEditing) && (
                    <ul className="space-y-2 md:space-y-4">
                        {isEditing ? (
                            // Edit Mode: Show purely in array order, modern styled inputs
                            editPoints.map((point, index) => (
                                <li key={index} className="flex items-start gap-4">
                                    <div className="mt-1 flex-shrink-0 text-white/20">
                                        <Circle size={16} className="md:w-5 md:h-5" />
                                    </div>
                                    <input
                                        type="text"
                                        value={point}
                                        onChange={(e) => updateEditPoint(index, e.target.value)}
                                        className="flex-1 bg-transparent border-none text-sm md:text-base text-white/90 placeholder-white/30 focus:outline-none leading-relaxed -ml-0.5 py-0.5"
                                        placeholder="Task text..."
                                    />
                                    <button
                                        onClick={() => {
                                            const newPts = editPoints.filter((_, i) => i !== index);
                                            setEditPoints(newPts);
                                        }}
                                        className="text-red-400/40 hover:text-red-300 transition-all mt-0.5"
                                    >
                                        <X size={16} />
                                    </button>
                                </li>
                            ))
                        ) : (
                            // View Mode: Sorted (Done at bottom)
                            sortedIndices.map((originalIndex) => {
                                const point = points[originalIndex];
                                const done = isDone(point);
                                const text = getCleanText(point);

                                // Image Block
                                if (point.startsWith('data:image_block:')) {
                                    const src = point.replace('data:image_block:', '');
                                    return (
                                        <li key={originalIndex} className="rounded-lg overflow-hidden border border-white/10">
                                            <img src={src} alt="Attachment" className="w-full h-auto object-cover" />
                                        </li>
                                    );
                                }
                                // Heading Block
                                if (point.startsWith('H:')) {
                                    const heading = point.replace('H:', '');
                                    return (
                                        <li key={originalIndex} className="mt-6 first:mt-0">
                                            <h4 className="text-white font-bold text-xl border-b border-white/10 pb-2 mb-2">{heading}</h4>
                                        </li>
                                    );
                                }

                                // Standard Text (Clickable Task)
                                return (
                                    <li
                                        key={originalIndex}
                                        className={`flex items - start gap - 2 md: gap - 4 text - sm md: text - base transition - all duration - 500 ease -in -out cursor - pointer group / item ${done ? 'opacity-40' : 'opacity-100'} `}
                                        onClick={() => toggleTaskDone(originalIndex)}
                                    >
                                        <button
                                            className="mt-0.5 md:mt-1 flex-shrink-0 text-white/40 group-hover/item:text-white transition-colors p-1 md:p-0 flex items-center justify-center"
                                        >
                                            {done ? <CheckCircle2 size={16} className="md:w-5 md:h-5 text-white/60" /> : <Circle size={16} className="md:w-5 md:h-5" />}
                                        </button>
                                        <span className={`break-words leading - relaxed flex - 1 ${done ? 'line-through decoration-white/30' : 'text-white/90'} `}>
                                            {text}
                                        </span>
                                    </li>
                                );
                            })
                        )}
                    </ul>
                )}

                {/* Inline Add Input */}
                {isAdding && (
                    <form onSubmit={handleFormSubmit} className="mt-4">
                        <input
                            ref={addInputRef}
                            autoFocus
                            type="text"
                            placeholder="Type text or use emoji..."
                            value={newPoint}
                            onChange={(e) => setNewPoint(e.target.value)}
                            onBlur={() => !newPoint && setIsAdding(false)}
                            className="w-full bg-white/10 text-white text-base px-4 py-3 rounded-xl border border-white/20 focus:outline-none focus:border-white/40 transition-all placeholder:text-white/30 shadow-inner"
                        />
                    </form>
                )}
            </div>

            {/* Action Bar & Tags */}
            <div className="mt-auto px-0.5 md:px-6 py-2 md:py-4 border-t border-white/5 flex flex-col gap-2 relative">

                {/* Tags */}
                {tags && tags.length > 0 && !isEditing && (
                    <div className="flex flex-wrap gap-1 px-2 mb-1">
                        {tags.map((tag, i) => (
                            <span key={i} className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-white/10 text-white/60">
                                {tag}
                            </span>
                        ))}
                    </div>
                )}

                <div className="flex gap-0 md:gap-2 justify-start items-center">

                    <Tooltip text="Add task">
                        <button
                            onClick={() => setIsAdding(!isAdding)}
                            className={`p - 2 md: p - 3 rounded - full hover: bg - white / 10 transition - all ${isAdding ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white/70'} `}
                        >
                            <Plus size={16} className="md:w-5 md:h-5" />
                        </button>
                    </Tooltip>

                    <Tooltip text={isEditing ? 'Save changes' : 'Edit note'}>
                        <button
                            onClick={() => {
                                if (isEditing) {
                                    saveEdits();
                                } else {
                                    setIsEditing(true);
                                }
                            }}
                            className={`p - 2 md: p - 3 rounded - full hover: bg - white / 10 transition - all ${isEditing ? 'text-green-400 bg-green-500/10 hover:text-green-300' : 'text-white/40 hover:text-white/70'} `}
                        >
                            {isEditing ? <Check size={16} className="md:w-5 md:h-5" /> : <PenLine size={16} className="md:w-5 md:h-5" />}
                        </button>
                    </Tooltip>

                    <Tooltip text="Upload image">
                        <button
                            onClick={triggerImageUpload}
                            className="p-2 md:p-3 rounded-full hover:bg-white/10 text-white/40 hover:text-white/70 transition-all"
                        >
                            <ImageIcon size={16} className="md:w-5 md:h-5" />
                        </button>
                    </Tooltip>

                    <Tooltip text={pinned ? 'Unpin note' : 'Pin note'}>
                        <button
                            onClick={() => onPin(id)}
                            className={`p - 2 md: p - 3 rounded - full hover: bg - white / 10 transition - all relative ${pinned ? 'text-yellow-400 hover:text-yellow-300' : 'text-white/40 hover:text-white/70'} `}
                        >
                            <Pin size={16} className="md:w-5 md:h-5" fill={pinned ? 'currentColor' : 'none'} />
                            {pinned && pin_order && (
                                <span className="absolute -top-0.5 -right-0.5 bg-yellow-500 text-black text-[8px] font-bold rounded-full w-3 h-3 flex items-center justify-center">
                                    {pin_order}
                                </span>
                            )}
                        </button>
                    </Tooltip>

                    <Tooltip text="Delete note">
                        <button
                            onClick={() => onDelete(id)}
                            className="p-2 md:p-3 rounded-full hover:bg-white/10 text-white/40 hover:text-red-400 transition-all"
                        >
                            <Trash2 size={16} className="md:w-5 md:h-5" />
                        </button>
                    </Tooltip>
                </div>

                {/* Hidden File Input */}
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageUpload}
                />


            </div>
        </div>
    );
}
