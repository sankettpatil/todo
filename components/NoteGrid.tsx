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
    reminder_time?: number;  // Unix timestamp for reminder
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
    const [newReminderDate, setNewReminderDate] = useState<string>(''); // YYYY-MM-DD
    const [newReminderTime, setNewReminderTime] = useState<string>(''); // HH:MM

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);

    // Snackbar State
    const [snackbar, setSnackbar] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

    // Sidebar State
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    // Drag and Drop State
    const [draggedNote, setDraggedNote] = useState<number | null>(null);
    const [dragOverNote, setDragOverNote] = useState<number | null>(null);


    useEffect(() => {
        // Force dark mode class
        document.documentElement.classList.add('dark');

        // Request notification permission
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }, []);

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login');
        } else if (status === 'authenticated') {
            fetchNotes();
        }
    }, [status, router]);

    // Check for reminders every minute
    useEffect(() => {
        const checkReminders = () => {
            const now = Math.floor(Date.now() / 1000);
            const notifiedKey = 'notified_reminders';
            const notified = JSON.parse(localStorage.getItem(notifiedKey) || '[]');

            notes.forEach(note => {
                if (note.reminder_time) {
                    // Only trigger if:
                    // 1. The reminder time has arrived (within the last 2 minutes)
                    // 2. Haven't already notified
                    const timeDiff = now - note.reminder_time;
                    const isTimeToNotify = timeDiff >= 0 && timeDiff < 120; // Within 2 minutes of scheduled time

                    if (isTimeToNotify && !notified.includes(note.id)) {
                        // Show snackbar notification
                        setSnackbar({
                            message: `⏰ Reminder: ${note.title}`,
                            type: 'info'
                        });

                        // Show system notification (works even if tab is not focused)
                        if ('Notification' in window && Notification.permission === 'granted') {
                            new Notification('Sticky Board Reminder', {
                                body: `msg: ${note.title}`,
                                icon: '/waving_man_3d_icon.png' // Use our new cool icon
                            });
                        }

                        // Mark as notified
                        notified.push(note.id);
                        localStorage.setItem(notifiedKey, JSON.stringify(notified));
                    }
                }
            });
        };

        // Check immediately and then every minute
        checkReminders();
        const interval = setInterval(checkReminders, 60000); // 1 minute

        return () => clearInterval(interval);
    }, [notes]);

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

        // Combine date and time into timestamp
        let reminderTimestamp: number | undefined;
        if (newReminderDate && newReminderTime) {
            const dateTimeStr = `${newReminderDate}T${newReminderTime}`;
            reminderTimestamp = Math.floor(new Date(dateTimeStr).getTime() / 1000);
        }

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
                    updated_at: timestamp,
                    reminder_time: reminderTimestamp
                }),
            });

            if (res.ok) {
                const savedNote = await res.json();
                setNotes([savedNote, ...notes]);
                setNewTitle('');
                setNewPoints(['']);
                setNewReminderDate(''); // Clear date
                setNewReminderTime(''); // Clear time

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

    // Drag and Drop Handlers
    const handleDragStart = (e: React.DragEvent, noteId: number) => {
        setDraggedNote(noteId);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent, noteId: number) => {
        e.preventDefault();
        setDragOverNote(noteId);
    };

    const handleDragEnd = () => {
        setDraggedNote(null);
        setDragOverNote(null);
    };

    const handleDrop = (e: React.DragEvent, targetNoteId: number) => {
        e.preventDefault();

        if (draggedNote === null || draggedNote === targetNoteId) {
            setDraggedNote(null);
            setDragOverNote(null);
            return;
        }

        // Reorder notes
        const newNotes = [...notes];
        const draggedIndex = newNotes.findIndex(n => n.id === draggedNote);
        const targetIndex = newNotes.findIndex(n => n.id === targetNoteId);

        if (draggedIndex !== -1 && targetIndex !== -1) {
            const [removed] = newNotes.splice(draggedIndex, 1);
            newNotes.splice(targetIndex, 0, removed);
            setNotes(newNotes);
        }

        setDraggedNote(null);
        setDragOverNote(null);
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
                body: JSON.stringify(updatesWithTime)
            });
            // Show update confirmation
            setSnackbar({ message: 'Note updated', type: 'success' });
        } catch (error) {
            console.error('Error updating note:', error);
            setSnackbar({ message: 'Failed to update note', type: 'error' });
            // Revert on error
            fetchNotes();
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
        if (hour < 12) return "Good morning";
        if (hour < 17) return "Good afternoon";
        return "Good evening";
    };

    const userName = session.user?.name?.split(' ')[0] || 'there';
    const greeting = getGreeting();

    return (
        <div className="flex flex-col h-screen">
            {/* TOP HEADER with Logout */}
            <div className="flex justify-between items-center px-8 py-3 border-b border-white/10">
                <div className="flex flex-col gap-0.5">
                    <h1 className="text-2xl font-bold text-white/90 tracking-tight">
                        {greeting}, {userName}
                    </h1>
                    <p className="text-sm text-white/40 font-medium">
                        DSA or Grocery List Today ?
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

                    {/* Profile Picture with Note Count Tooltip */}
                    <div className="flex flex-col items-center gap-1.5">
                        {/* Profile Picture - Shows note count on hover */}
                        <div className="group relative">
                            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white/20 hover:border-white/40 transition-all duration-200 hover:scale-105 cursor-pointer">
                                {session.user?.image ? (
                                    <img
                                        src={session.user.image}
                                        alt="Profile"
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                                        {session.user?.name?.charAt(0).toUpperCase()}
                                    </div>
                                )}
                            </div>
                            {/* Note count tooltip */}
                            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap bg-black/90 text-white text-xs px-2 py-1 rounded">
                                {notes.length} {notes.length === 1 ? 'note' : 'notes'}
                            </div>
                        </div>
                        {/* Clickable Sign Out text */}
                        <button
                            onClick={() => import('next-auth/react').then(m => m.signOut())}
                            className="text-[9px] font-semibold text-white/40 hover:text-white/70 uppercase tracking-wide transition-colors cursor-pointer"
                        >
                            Sign Out
                        </button>
                    </div>
                </div>
            </div>

            {/* MAIN CONTENT */}
            <div className="flex-1 flex overflow-hidden">
                {/* LEFT PANEL: Create Note - Collapsible */}
                <div className={`border-r border-white/5 flex items-center justify-center p-8 overflow-y-auto custom-scrollbar transition-all duration-300 ${isSidebarOpen ? 'w-[400px]' : 'w-0 p-0'}`}>
                    {isSidebarOpen && (
                        <div className="
                        relative w-full max-w-md
                        bg-gradient-to-br from-[#1c1c1e]/90 to-[#2c2c2e]/70
                        backdrop-blur-3xl
                        rounded-[2rem]
                        p-5
                        border border-white/10
                        shadow-2xl shadow-black/40
                        flex flex-col
                        max-h-full
                        ">
                            {/* Subtle Top Gradient Line */}
                            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>

                            <h2 className="text-2xl font-bold mb-4 text-center text-white tracking-tight">
                                New Note
                            </h2>

                            <form id="create-note-form" onSubmit={handleCreateNote} className="flex flex-col">
                                <div className="space-y-3 pb-4">
                                    <input
                                        type="text"
                                        placeholder="Title"
                                        value={newTitle}
                                        onChange={(e) => setNewTitle(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-base font-semibold text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 focus:bg-white/[0.08] transition-all duration-200 block"
                                    />

                                    <div className="space-y-2.5">
                                        {newPoints.map((point, index) => (
                                            <div key={index} className="flex gap-2 group">
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
                                                    className="flex-1 bg-white/[0.04] border border-white/[0.1] rounded-lg px-3.5 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 focus:bg-white/[0.07] transition-all duration-200 font-normal block"
                                                    autoFocus={index === newPoints.length - 1 && index > 0}
                                                />
                                                {newPoints.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setNewPoints(newPoints.filter((_, i) => i !== index))}
                                                        className="text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 p-1.5 rounded-lg"
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    <button
                                        type="button"
                                        onClick={addPointInput}
                                        className="w-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] hover:border-white/15 rounded-lg px-3.5 py-2 text-white/40 hover:text-white/80 transition-all duration-200 flex items-center gap-2 group text-sm font-normal text-left"
                                    >
                                        <Plus size={16} className="opacity-50 group-hover:opacity-100 transition-opacity" />
                                        <span>Add another task</span>
                                    </button>

                                    {/* Reminder Date & Time Picker */}
                                    <div className="pt-2 space-y-2">
                                        <label className="block text-[9px] font-bold text-white/40 uppercase tracking-widest">
                                            ⏰ Remind Me
                                        </label>
                                        <div className="grid grid-cols-2 gap-2.5">
                                            <div>
                                                <label className="block text-[8px] font-semibold text-white/30 mb-1 uppercase tracking-wide">
                                                    Date
                                                </label>
                                                <input
                                                    type="date"
                                                    value={newReminderDate}
                                                    onChange={(e) => setNewReminderDate(e.target.value)}
                                                    className="w-full bg-white/[0.04] border border-white/[0.1] rounded-lg px-2.5 py-1.5 text-xs text-white/70 placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 focus:bg-white/[0.07] transition-all duration-200 [color-scheme:dark] hover:bg-white/[0.06] hover:border-white/15 cursor-pointer"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[8px] font-semibold text-white/30 mb-1 uppercase tracking-wide">
                                                    Time
                                                </label>
                                                <input
                                                    type="time"
                                                    value={newReminderTime}
                                                    onChange={(e) => setNewReminderTime(e.target.value)}
                                                    className="w-full bg-white/[0.04] border border-white/[0.1] rounded-lg px-2.5 py-1.5 text-xs text-white/70 placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 focus:bg-white/[0.07] transition-all duration-200 [color-scheme:dark] hover:bg-white/[0.06] hover:border-white/15 cursor-pointer"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </form>

                            <div className="pt-3 mt-3 border-t border-white/10">
                                <button
                                    type="submit"
                                    form="create-note-form"
                                    disabled={!newTitle.trim()}
                                    className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 disabled:from-gray-600 disabled:to-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold tracking-wide py-2.5 px-4 rounded-xl shadow-xl shadow-blue-500/30 hover:shadow-blue-500/40 disabled:shadow-none transition-all duration-300 transform hover:-translate-y-0.5 hover:scale-[1.02] active:translate-y-0 active:scale-100 text-sm uppercase"
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
                    {/* Responsive Grid with Scrolling */}
                    <div className="flex-1 p-4 md:p-8 overflow-y-auto custom-scrollbar">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 max-w-[1800px] mx-auto auto-rows-max">
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
                                        reminder_time={note.reminder_time}
                                        onDelete={handleDelete}
                                        onUpdate={handleUpdate}
                                        draggable={true}
                                        onDragStart={handleDragStart}
                                        onDragOver={handleDragOver}
                                        onDragEnd={handleDragEnd}
                                        onDrop={handleDrop}
                                        isDragging={draggedNote === note.id}
                                        isDragOver={dragOverNote === note.id}
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

            {/* Footer */}
            <div className="border-t border-white/5 py-3 text-center">
                <p className="text-xs text-white/30 font-medium">
                    Made With <span className="text-red-400">❤️</span> By Sanket
                </p>
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
