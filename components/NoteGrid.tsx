"use client";

import { useSession, signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import StickyNote from './StickyNote';
import Snackbar from './Snackbar';
import { Plus, X } from 'lucide-react';

interface Note {
    id: number;
    title: string;
    description?: string;
    points: string[];
    created_at?: number;
    updated_at?: number;
}

export default function NoteGrid() {
    const { data: session, status } = useSession();
    const router = useRouter();

    const [notes, setNotes] = useState<Note[]>([]);
    const NOTES_PER_PAGE = 6; // 2 rows × 3 columns
    const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

    // Form State
    const [newTitle, setNewTitle] = useState('');
    const [newPoints, setNewPoints] = useState<string[]>(['']);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);

    // Snackbar State
    const [snackbar, setSnackbar] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

    // Sidebar State
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);


    useEffect(() => {
        // Force dark mode class
        document.documentElement.classList.add('dark');
    }, []);

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login');
        } else if (status === 'authenticated') {
            fetchNotes();
        }
    }, [status, router]);

    const fetchNotes = async () => {
        if (!session?.user?.email) return;
        try {
            const res = await fetch(`${API_URL}/notes/`, {
                headers: {
                    'X-User-Email': session.user.email
                }
            });
            if (res.ok) {
                const data = await res.json();
                setNotes(data.reverse()); // Newest first
            }
        } catch (error) {
            console.error('Error fetching notes:', error);
        }
    };

    const handleCreateNote = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTitle.trim() || !session?.user?.email) return;

        const nonEmptyPoints = newPoints.filter(p => p.trim());
        const timestamp = Math.floor(Date.now() / 1000);

        try {
            const res = await fetch(`${API_URL}/notes/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-User-Email': session.user.email
                },
                body: JSON.stringify({
                    title: newTitle,
                    points: nonEmptyPoints,
                    owner_email: session.user.email,
                    created_at: timestamp,
                    updated_at: timestamp
                }),
            });

            if (res.ok) {
                const savedNote = await res.json();
                setNotes([savedNote, ...notes]);
                setNewTitle('');
                setNewPoints(['']);

                // Show success snackbar
                setSnackbar({ message: 'Note created successfully!', type: 'success' });

                // Auto collapse sidebar
                setIsSidebarOpen(false);

                // Auto hide snackbar
                setTimeout(() => setSnackbar(null), 3000);
            }
        } catch (error) {
            console.error('Error creating note:', error);
            setSnackbar({ message: 'Failed to create note.', type: 'error' });
        }
    };

    const handleDelete = async (id: number) => {
        if (!session?.user?.email) return;
        if (!confirm('Are you sure you want to delete this note?')) return;

        try {
            const res = await fetch(`${API_URL}/notes/${id}`, {
                method: 'DELETE',
                headers: {
                    'X-User-Email': session.user.email
                }
            });

            if (res.ok) {
                setNotes(notes.filter(n => n.id !== id));
                setSnackbar({ message: 'Note deleted.', type: 'info' });
                setTimeout(() => setSnackbar(null), 3000);
            }
        } catch (error) {
            console.error('Error deleting note:', error);
        }
    };

    const handleUpdate = async (id: number, updates: { title?: string, description?: string, points?: string[] }) => {
        if (!session?.user?.email) return;

        const timestamp = Math.floor(Date.now() / 1000);
        const updatesWithTime = { ...updates, updated_at: timestamp };

        // Optimistic UI Update
        const updatedNotes = notes.map(n => n.id === id ? { ...n, ...updatesWithTime } : n);

        // Re-sort if updated_at changed (move moved to top if we sorted by time, but here we sort by created usually)
        // Let's keep position for now, just update content
        setNotes(updatedNotes);

        try {
            await fetch(`${API_URL}/notes/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-User-Email': session.user.email
                },
                body: JSON.stringify(updatesWithTime),
            });
            // Background sync success
        } catch (error) {
            console.error('Error updating note:', error);
        }
    };

    const handlePointChange = (index: number, value: string) => {
        const updated = [...newPoints];
        updated[index] = value;
        setNewPoints(updated);
    };

    const addPointInput = () => {
        setNewPoints([...newPoints, '']);
    };

    // Pagination Logic
    const totalPages = Math.ceil(notes.length / NOTES_PER_PAGE);
    const startIndex = (currentPage - 1) * NOTES_PER_PAGE;
    const currentNotes = notes.slice(startIndex, startIndex + NOTES_PER_PAGE);

    const goToNextPage = () => {
        if (currentPage < totalPages) setCurrentPage(p => p + 1);
    };

    const goToPrevPage = () => {
        if (currentPage > 1) setCurrentPage(p => p - 1);
    };

    if (status === 'loading') {
        return <div className="flex h-screen items-center justify-center text-white/50">Loading space...</div>;
    }

    if (!session) {
        return null; // Will redirect in useEffect
    }

    // Get greeting based on time
    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return { text: "Good morning", emoji: "☀️" };
        if (hour < 17) return { text: "Good afternoon", emoji: "🌤️" };
        return { text: "Good evening", emoji: "🌙" };
    };

    const userName = session.user?.name?.split(' ')[0] || 'there';
    const greeting = getGreeting();

    return (
        <div className="flex flex-col h-screen">
            {/* TOP HEADER with Logout */}
            <div className="flex justify-between items-center px-8 py-3 border-b border-white/10">
                <div className="flex flex-col gap-1">
                    <h1 className="text-lg font-medium text-white/50 tracking-tight">Sanket's lovey dovey project</h1>
                    <p className="text-xl font-bold text-white/90">
                        {greeting.text}, {userName} {greeting.emoji} — {notes.length} {notes.length === 1 ? 'note' : 'notes'}
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="flex items-center gap-3">
                            <button
                                onClick={goToPrevPage}
                                disabled={currentPage === 1}
                                className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-white transition-all text-sm font-medium border border-white/10"
                            >
                                ← Prev
                            </button>
                            <span className="text-white/60 text-sm font-medium">
                                {currentPage} / {totalPages}
                            </span>
                            <button
                                onClick={goToNextPage}
                                disabled={currentPage === totalPages}
                                className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-white transition-all text-sm font-medium border border-white/10"
                            >
                                Next →
                            </button>
                        </div>
                    )}

                    {session && (
                        <button
                            onClick={() => import('next-auth/react').then(m => m.signOut())}
                            className="px-6 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20 hover:border-red-500/30 font-semibold text-sm transition-all"
                        >
                            Sign Out
                        </button>
                    )}
                </div>
            </div>

            {/* MAIN CONTENT */}
            <div className="flex-1 flex overflow-hidden">
                {/* LEFT PANEL: Create Note - Collapsible */}
                <div className={`border-r border-white/5 flex items-center justify-center p-8 overflow-y-auto custom-scrollbar transition-all duration-300 ${isSidebarOpen ? 'w-[400px]' : 'w-0 p-0'}`}>
                    {isSidebarOpen && (
                        <div className="
                        relative w-full max-w-md
                        bg-gradient-to-br from-[#1c1c1e]/80 to-[#2c2c2e]/60
                        backdrop-blur-3xl
                        rounded-3xl
                        p-10
                        border border-white/10
                        shadow-2xl
                        flex flex-col
                        max-h-full
                        ">
                            {/* Subtle Top Gradient Line */}
                            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>

                            <h2 className="text-3xl font-semibold mb-8 text-center text-white tracking-tight">
                                New Note
                            </h2>

                            <form id="create-note-form" onSubmit={handleCreateNote} className="flex flex-col flex-1 overflow-y-auto pr-2 custom-scrollbar">
                                <div className="space-y-6 pb-6">
                                    <input
                                        type="text"
                                        placeholder="e.g. Grocery List"
                                        value={newTitle}
                                        onChange={(e) => setNewTitle(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-xl font-medium text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all block"
                                    />

                                    <div className="space-y-3">
                                        {newPoints.map((point, index) => (
                                            <div key={index} className="flex gap-3 group">
                                                <input
                                                    type="text"
                                                    placeholder={`Task ${index + 1}`}
                                                    value={point}
                                                    onChange={(e) => handlePointChange(index, e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            addPointInput();
                                                        }
                                                        if (e.key === 'Backspace' && point === '' && newPoints.length > 1) {
                                                            e.preventDefault();
                                                            setNewPoints(newPoints.filter((_, i) => i !== index));
                                                        }
                                                    }}
                                                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-base text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all font-light block"
                                                    autoFocus={index === newPoints.length - 1 && index > 0}
                                                />
                                                {newPoints.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setNewPoints(newPoints.filter((_, i) => i !== index))}
                                                        className="text-white/20 hover:text-red-400 transition-colors p-2"
                                                    >
                                                        <X size={18} />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    <button
                                        type="button"
                                        onClick={addPointInput}
                                        className="w-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl px-4 py-3 text-white/50 hover:text-white/80 transition-all flex items-center gap-3 group text-base font-normal text-left block"
                                    >
                                        <Plus size={20} className="opacity-50 group-hover:opacity-100 transition-opacity" />
                                        <span className="">Add another task</span>
                                    </button>
                                </div>
                            </form>

                            <div className="pt-4 mt-4 border-t border-white/5">
                                <button
                                    type="submit"
                                    form="create-note-form"
                                    disabled={!newTitle.trim()}
                                    className="w-full bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-xl shadow-lg shadow-blue-500/20 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
                                >
                                    Create Note
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar Toggle Button */}
                <button
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-r-xl px-2 py-6 text-white/40 hover:text-white/70 transition-all ml-0"
                    style={{ marginLeft: isSidebarOpen ? '400px' : '0px', transition: 'margin-left 300ms' }}
                >
                    <span className="text-xl">{isSidebarOpen ? '‹' : '›'}</span>
                </button>

                {/* RIGHT PANEL: Saved Notes Grid */}
                <div className="flex-1 flex flex-col">
                    {/* Fixed Grid - 3 columns */}
                    <div className="flex-1 p-8 overflow-hidden">
                        <div className="grid grid-cols-3 gap-8 h-full max-w-[1800px] mx-auto">
                            {currentNotes.length > 0 ? (
                                currentNotes.map(note => (
                                    <StickyNote
                                        key={note.id}
                                        id={note.id}
                                        title={note.title}
                                        description={note.description}
                                        points={note.points}
                                        created_at={note.created_at}
                                        updated_at={note.updated_at}
                                        onDelete={handleDelete}
                                        onUpdate={handleUpdate}
                                    />
                                ))
                            ) : (
                                <div className="col-span-full flex flex-col items-center justify-center py-20 opacity-50">
                                    <div className="text-6xl mb-4">🌑</div>
                                    <p className="text-xl">The void is empty.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Snackbar */}
            {snackbar && (
                <Snackbar
                    message={snackbar.message}
                    type={snackbar.type}
                    onClose={() => setSnackbar(null)}
                />
            )}
        </div>
    );
}
