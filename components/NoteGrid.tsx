"use client";

import { useSession, signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import StickyNote from './StickyNote';
import Snackbar from './Snackbar';
import Tooltip from './Tooltip';
import { Plus, X, Play, Pause, Square, Info, BarChart2 } from 'lucide-react';

interface Note {
    id: number;
    title: string;
    description?: string;
    points: string[];
    created_at?: number;
    updated_at?: number;
    reminder_time?: number;  // Unix timestamp for reminder
    pinned?: boolean;
    pin_order?: number;
}

export default function NoteGrid() {
    const { data: session, status } = useSession();
    const router = useRouter();

    const [notes, setNotes] = useState<Note[]>([]);
    const NOTES_PER_PAGE = 6; // 2 rows × 3 columns (desktop)
    const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

    // Form State
    const [newTitle, setNewTitle] = useState('');
    const [newPoints, setNewPoints] = useState<string[]>(['']);
    const [newReminderDate, setNewReminderDate] = useState<string>(''); // YYYY-MM-DD
    const [newReminderTime, setNewReminderTime] = useState<string>(''); // HH:MM

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);

    // Snackbar State
    const [snackbar, setSnackbar] = useState<{ message: string; type: 'created' | 'edited' | 'deleted' | 'error' | 'info' } | null>(null);

    // Sidebar State
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    // Drag and Drop State
    const [draggedNote, setDraggedNote] = useState<number | null>(null);
    const [dragOverNote, setDragOverNote] = useState<number | null>(null);

    // Advanced Timer State
    const [timerSeconds, setTimerSeconds] = useState(0);
    const [timerStatus, setTimerStatus] = useState<'idle' | 'running' | 'paused'>('idle');
    const [dailyStats, setDailyStats] = useState({ totalSeconds: 0, laps: 0, resets: 0, completedNotes: 0, date: '' });
    const [isStatsOpen, setIsStatsOpen] = useState(false);
    const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Initialize Daily Stats
    useEffect(() => {
        const today = new Date().toLocaleDateString();
        const savedStats = JSON.parse(localStorage.getItem('study_stats') || '{}');

        if (savedStats.date === today) {
            setDailyStats({
                totalSeconds: savedStats.totalSeconds || 0,
                laps: savedStats.laps || 0,
                resets: savedStats.resets || 0,
                completedNotes: savedStats.completedNotes || 0,
                date: today
            });
        } else {
            // New day, reset stats
            const newStats = { totalSeconds: 0, laps: 0, resets: 0, completedNotes: 0, date: today };
            setDailyStats(newStats);
            localStorage.setItem('study_stats', JSON.stringify(newStats));
        }
    }, []);

    // Timer Logic
    useEffect(() => {
        if (timerStatus === 'running') {
            timerIntervalRef.current = setInterval(() => {
                setTimerSeconds(s => s + 1);
            }, 1000);
        } else {
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        }
        return () => {
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        };
    }, [timerStatus]);

    const handleTimerStart = () => {
        setTimerStatus('running');
    };

    const handleTimerPause = () => {
        setTimerStatus('paused');
        // Record Lap and Add to Daily Stats
        // Note: For simplicity, we just add the *elapsed session time since last pause*? 
        // Actually, user said "paused time... counted as lap 1".
        // To strictly follow "lap 1 is start->pause", "lap 2 is resume->pause":
        // We need to track the *duration of the current lap*.
        // But the main counter shows *total session time*. 
        // Let's increment the LAP COUNT.
        // We'll calculate the *delta* added to daily total in a real implementation, 
        // but for now let's just assume we add the accumulated seconds since last pause? 
        // Actually, a simpler way for "Daily Study Time" is to just update it every second or on pause.
        // Let's update stats on Pause/Stop for accuracy.
        // Wait, if we reset on Stop, we need to know how much to add.
        // Let's stick to: Update Daily Stats continuously or on Pause?
        // Let's update on Pause/Stop to minimize writes.
        // We need 'startTime' of the current lap to know how much to add.
        // Let's use a simpler approach: 
        // We won't track exact "lap durations" separately, just increment Lap Count on Pause.
        // The "Daily Study Time" should technically be the sum of all timer activity today.
        // Let's just add 1 second to daily stats in the interval for 100% accuracy.
    };

    // Modified Interval for Daily Stats Accuracy
    useEffect(() => {
        if (timerStatus === 'running') {
            const interval = setInterval(() => {
                setTimerSeconds(s => s + 1);
                setDailyStats(prev => {
                    const newStats = { ...prev, totalSeconds: prev.totalSeconds + 1 };
                    localStorage.setItem('study_stats', JSON.stringify(newStats));
                    return newStats;
                });
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [timerStatus]);

    // Override the previous simple interval

    const onPauseClick = () => {
        setTimerStatus('paused');
        setDailyStats(prev => {
            const newStats = { ...prev, laps: prev.laps + 1 };
            localStorage.setItem('study_stats', JSON.stringify(newStats));
            return newStats;
        });
    };

    const onStopClick = () => {
        // Increment Resets
        setDailyStats(prev => {
            const newStats = { ...prev, resets: prev.resets + 1 };
            localStorage.setItem('study_stats', JSON.stringify(newStats));
            return newStats;
        });

        setTimerStatus('idle');
        setTimerSeconds(0);
    };

    const handleNoteComplete = (id: number) => {
        setDailyStats(prev => {
            const newStats = { ...prev, completedNotes: prev.completedNotes + 1 };
            localStorage.setItem('study_stats', JSON.stringify(newStats));
            return newStats;
        });
    };

    const formatTime = (totalSeconds: number) => {
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    const formatDailyTime = (totalSeconds: number) => {
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        return `${hours}h ${minutes}m`;
    };


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
                setNotes(data); // Backend handles sorting: Pinned first, then Newest (ID desc)
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
                setSnackbar({ message: 'Note created successfully!', type: 'created' });

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
                setSnackbar({ message: 'Note deleted.', type: 'deleted' });
                setTimeout(() => setSnackbar(null), 3000);
            }
        } catch (error) {
            console.error('Error deleting note:', error);
        }
    };

    const handlePinNote = async (id: number) => {
        if (!session?.user?.email) return;

        try {
            const res = await fetch(`${API_URL}/notes/${id}/pin`, {
                method: 'PATCH',
                headers: {
                    'X-User-Email': session.user.email
                }
            });

            if (res.ok) {
                const result = await res.json();

                // Re-fetch notes to get proper sort order from server
                await fetchNotes();

                setSnackbar({
                    message: result.pinned ? `Note pinned (#${result.pin_order})` : 'Note unpinned',
                    type: 'info'
                });
                setTimeout(() => setSnackbar(null), 3000);
            } else if (res.status === 400) {
                const error = await res.json();
                setSnackbar({ message: error.detail, type: 'error' });
                setTimeout(() => setSnackbar(null), 3000);
            }
        } catch (error) {
            console.error('Error pinning note:', error);
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
            setSnackbar({ message: 'Note updated', type: 'edited' });
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
            {/* TOP HEADER with Logout - Responsive */}
            <div className="border-b border-white/10">
                {/* Top row: Greeting + Profile (always horizontal) */}
                <div className="flex justify-between items-center px-4 sm:px-6 lg:px-8 py-3">
                    {/* Greeting */}
                    <div className="flex flex-col gap-0.5">
                        <h1 className="text-2xl md:text-3xl font-bold text-white/90 tracking-tight">
                            {greeting}, {userName}
                        </h1>
                        <p className="text-sm md:text-base text-white/40 font-medium hidden sm:block">
                            DSA or Grocery List Today ?
                        </p>
                    </div>

                    <div className="flex items-center gap-4 md:gap-6">
                        {/* Timer */}
                        <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-full border border-white/10 relative group">

                            <span className="text-white font-mono text-lg font-medium tracking-wider w-[60px] text-center">
                                {formatTime(timerSeconds)}
                            </span>

                            <div className="flex items-center gap-2">
                                {/* Play/Resume Button */}
                                {(timerStatus === 'idle' || timerStatus === 'paused') && (
                                    <button
                                        onClick={handleTimerStart}
                                        className="w-8 h-8 rounded-full bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/20 flex items-center justify-center transition-all"
                                        title={timerStatus === 'paused' ? "Resume" : "Start"}
                                    >
                                        <Play size={12} fill="currentColor" className={timerStatus === 'paused' ? "ml-0" : "ml-0.5"} />
                                    </button>
                                )}

                                {/* Pause Button */}
                                {timerStatus === 'running' && (
                                    <button
                                        onClick={onPauseClick}
                                        className="w-8 h-8 rounded-full bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 border border-yellow-500/20 flex items-center justify-center transition-all"
                                        title="Pause (Lap)"
                                    >
                                        <Pause size={12} fill="currentColor" />
                                    </button>
                                )}

                                {/* Stop/End Button - Only show if not idle */}
                                {timerStatus !== 'idle' && (
                                    <button
                                        onClick={onStopClick}
                                        className="w-8 h-8 rounded-full bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/20 flex items-center justify-center transition-all"
                                        title="End Session"
                                    >
                                        <Square size={12} fill="currentColor" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Profile Picture with Note Count Tooltip - Always top-right */}
                        <div className="flex flex-col items-center gap-1.5">
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
                                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap bg-black/90 text-white text-xs px-2 py-1 rounded">
                                    {notes.length} {notes.length === 1 ? 'note' : 'notes'}
                                </div>
                            </div>
                            <button
                                onClick={() => import('next-auth/react').then(m => m.signOut())}
                                className="text-[9px] font-semibold text-white/40 hover:text-white/70 uppercase tracking-wide transition-colors cursor-pointer min-h-[44px] lg:min-h-0 flex items-center"
                            >
                                Sign Out
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* MAIN CONTENT */}
            <div className="flex-1 flex overflow-hidden relative">
                {/* Mobile Backdrop */}
                {isSidebarOpen && (
                    <div
                        className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300"
                        onClick={() => setIsSidebarOpen(false)}
                    />
                )}

                {/* LEFT PANEL: Create Note - Responsive Drawer/Sidebar */}
                <div className={`
                    border-white/5 flex items-center justify-center overflow-y-auto custom-scrollbar
                    transition-all duration-300
                    
                lg:relative lg:border-r
                ${isSidebarOpen ? 'lg:w-[450px] lg:p-6 lg:py-8' : 'lg:w-0 lg:p-0 lg:border-r-0'}
                
                fixed lg:static inset-y-0 left-0 z-50 lg:z-auto
                w-full sm:w-[400px]
                ${isSidebarOpen ? 'translate-x-0 p-4 sm:p-6' : '-translate-x-full p-0'}
                ${isSidebarOpen ? 'border-r lg:border-r' : 'border-r-0'}
            `}>
                    {isSidebarOpen && (
                        <div className="
                    relative w-full h-full
                    bg-[#1c1c1e]/80
                    backdrop-blur-3xl
                    rounded-[1.5rem] lg:rounded-[2rem]
                    p-6 sm:p-8
                    border border-white/10
                    shadow-2xl shadow-black/40
                    flex flex-col
                    max-h-full
                    ">
                            {/* Mobile Close Button */}
                            <button
                                onClick={() => setIsSidebarOpen(false)}
                                className="lg:hidden absolute top-4 right-4 text-white/40 hover:text-white/80 hover:bg-white/10 rounded-lg p-2 transition-all"
                                aria-label="Close"
                            >
                                <X size={20} />
                            </button>
                            {/* Subtle Top Gradient Line */}
                            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>

                            <h2 className="text-2xl font-bold mb-4 text-center text-white tracking-tight">
                                Add Note
                            </h2>

                            <form id="create-note-form" onSubmit={handleCreateNote} className="flex flex-col">
                                <div className="space-y-3 pb-4">
                                    {/* Title Input */}
                                    <input
                                        type="text"
                                        placeholder="Note Title"
                                        value={newTitle}
                                        onChange={(e) => setNewTitle(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-full px-6 py-3 text-sm font-bold text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 focus:bg-white/10 transition-all duration-200 block shadow-inner shadow-black/20"
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
                                                    className="flex-1 bg-white/5 border border-white/10 rounded-full px-6 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 focus:bg-white/10 transition-all duration-200 font-normal block shadow-inner shadow-black/20"
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

                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={addPointInput}
                                            className="flex-1 bg-white/10 hover:bg-white/20 border border-white/10 hover:border-white/20 rounded-full px-5 py-3 text-white/60 hover:text-white transition-all duration-200 flex items-center justify-center gap-2 group text-sm font-medium shadow-sm"
                                        >
                                            <Plus size={18} className="opacity-70 group-hover:opacity-100 transition-opacity" />
                                            <span>Add Task</span>
                                        </button>

                                        <label className="bg-white/10 hover:bg-white/20 border border-white/10 hover:border-white/20 rounded-full w-12 h-12 flex items-center justify-center cursor-pointer transition-all group text-white/60 hover:text-white shadow-sm">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (!file) return;
                                                    const reader = new FileReader();
                                                    reader.onload = (ev) => {
                                                        const dataUrl = ev.target?.result as string;
                                                        if (dataUrl) {
                                                            if (newPoints.length === 1 && newPoints[0] === '') {
                                                                setNewPoints([`data:image_block:${dataUrl}`]);
                                                            } else {
                                                                setNewPoints([...newPoints, `data:image_block:${dataUrl}`]);
                                                            }
                                                        }
                                                    };
                                                    reader.readAsDataURL(file);
                                                }}
                                            />
                                            <div title="Add Image">
                                                {/* Using a generic image icon, assuming ImageIcon is imported or use lucide-react */}
                                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" /></svg>
                                            </div>
                                        </label>
                                    </div>

                                </div>
                            </form>

                            {/* Spacer to push content to bottom */}
                            <div className="flex-1"></div>

                            {/* Reminder Section - Moved to bottom */}
                            <div className="space-y-2 mb-3 px-1">
                                <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest pl-2 flex items-center gap-2">
                                    <span>⏰ Remind Me</span>
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="date"
                                        value={newReminderDate}
                                        onChange={(e) => setNewReminderDate(e.target.value)}
                                        className="flex-1 bg-white/5 border border-white/10 rounded-full px-6 py-3 text-sm font-medium text-white/90 placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 focus:bg-white/10 transition-all duration-200 [color-scheme:dark] hover:bg-white/10 cursor-pointer text-center font-sans shadow-inner shadow-black/20"
                                    />
                                    <input
                                        type="time"
                                        value={newReminderTime}
                                        onChange={(e) => setNewReminderTime(e.target.value)}
                                        className="w-32 bg-white/5 border border-white/10 rounded-full px-6 py-3 text-sm font-medium text-white/90 placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 focus:bg-white/10 transition-all duration-200 [color-scheme:dark] hover:bg-white/10 cursor-pointer text-center font-sans shadow-inner shadow-black/20"
                                    />
                                </div>
                            </div>

                            <div className="pt-3 mt-3 border-t border-white/10">
                                <button
                                    type="submit"
                                    form="create-note-form"
                                    disabled={!newTitle.trim()}
                                    className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 disabled:from-gray-600 disabled:to-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold tracking-wide py-3 px-6 rounded-full shadow-xl shadow-blue-500/30 hover:shadow-blue-500/40 disabled:shadow-none transition-all duration-300 transform hover:-translate-y-0.5 hover:scale-[1.02] active:translate-y-0 active:scale-100 text-sm uppercase"
                                >
                                    Create Note
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar Toggle Button - Desktop: Side toggle, Mobile: Floating + button */}
                {/* Desktop Toggle */}
                {/* Wrapper for positioning */}
                <div
                    className="hidden lg:flex absolute left-0 top-1/2 -translate-y-1/2 z-50 items-center transition-all duration-300 ease-in-out"
                    style={{ marginLeft: isSidebarOpen ? '450px' : '0px' }}
                >
                    <Tooltip text="Click to add new note" position="right">
                        <button
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="w-5 h-16 bg-[#1c1c1e]/80 backdrop-blur-xl border-y border-r border-white/10 rounded-r-xl flex items-center justify-center text-white/30 hover:text-white/80 hover:bg-white/10 transition-all shadow-2xl group"
                        >
                            <div className="w-0.5 h-6 rounded-full bg-white/20 group-hover:bg-blue-400/50 transition-colors"></div>
                        </button>
                    </Tooltip>
                </div>

                {/* Mobile Floating + Button */}
                {
                    !isSidebarOpen && (
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className="lg:hidden fixed bottom-6 right-6 z-30 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-full p-4 shadow-2xl shadow-blue-500/40 hover:shadow-blue-500/60 transition-all duration-300 hover:scale-110 active:scale-95"
                            aria-label="Create Note"
                        >
                            <Plus size={24} />
                        </button>
                    )
                }

                {/* RIGHT PANEL: Saved Notes Grid */}
                <div className="flex-1 flex flex-col relative">
                    {/* Responsive Grid with Scrolling */}
                    <div className="flex-1 p-4 md:p-8 overflow-y-auto custom-scrollbar pb-20">
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-8 max-w-[1800px] mx-auto auto-rows-max">
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
                                        pinned={note.pinned}
                                        pin_order={note.pin_order}
                                        onDelete={handleDelete}
                                        onUpdate={handleUpdate}
                                        onPin={handlePinNote}
                                        draggable={true}
                                        onDragStart={handleDragStart}
                                        onDragOver={handleDragOver}
                                        onDragEnd={handleDragEnd}
                                        onDrop={handleDrop}
                                        onComplete={handleNoteComplete}
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

                    {/* Stats Button & Pagination Container */}
                    <div className="absolute bottom-6 right-6 flex items-center gap-3 z-20">
                        {/* Stats Button */}
                        <button
                            onClick={() => setIsStatsOpen(true)}
                            className="flex items-center gap-2 bg-[#1c1c1e]/80 backdrop-blur-md p-2 px-4 rounded-full border border-white/10 shadow-2xl hover:bg-white/10 transition-all group"
                            title="View Daily Stats"
                        >
                            <BarChart2 size={16} className="text-blue-400 group-hover:text-blue-300" />
                            <span className="text-xs font-bold text-white/60 group-hover:text-white/90 uppercase tracking-wider">Stats</span>
                        </button>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center gap-2 bg-[#1c1c1e]/80 backdrop-blur-md p-2 rounded-2xl border border-white/10 shadow-2xl">
                                <button
                                    onClick={goToPrevPage}
                                    disabled={currentPage === 1}
                                    className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-white transition-all text-xs font-medium border border-white/10"
                                >
                                    ← Prev
                                </button>
                                <span className="text-white/60 text-xs font-bold px-2">
                                    {currentPage} / {totalPages}
                                </span>
                                <button
                                    onClick={goToNextPage}
                                    disabled={currentPage === totalPages}
                                    className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-white transition-all text-xs font-medium border border-white/10"
                                >
                                    Next →
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div >

            {/* Stats Modal */}
            {
                isStatsOpen && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                        {/* Backdrop with blur */}
                        <div
                            className="absolute inset-0 bg-black/40 backdrop-blur-md transition-all"
                            onClick={() => setIsStatsOpen(false)}
                        />

                        {/* Modal Content */}
                        <div className="relative bg-[#1c1c1e]/80 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl max-w-sm w-full transform transition-all scale-100 ring-1 ring-white/5">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                                    <BarChart2 className="text-blue-500" />
                                    Daily Stats
                                </h3>
                                <button
                                    onClick={() => setIsStatsOpen(false)}
                                    className="text-white/40 hover:text-white bg-white/5 hover:bg-white/10 rounded-full p-2 transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {/* Total Time */}
                                <div className="col-span-2 bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/5 rounded-2xl p-5 flex flex-col items-center justify-center gap-1 group hover:border-white/10 transition-colors">
                                    <span className="text-3xl font-mono font-bold text-white group-hover:scale-105 transition-transform duration-300">
                                        {formatDailyTime(dailyStats.totalSeconds)}
                                    </span>
                                    <span className="text-xs font-bold text-white/40 uppercase tracking-widest">Total Focus</span>
                                </div>

                                {/* Laps */}
                                <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex flex-col items-center justify-center gap-1 hover:bg-white/10 transition-colors">
                                    <span className="text-2xl font-bold text-white">{dailyStats.laps}</span>
                                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Laps</span>
                                </div>

                                {/* Resets */}
                                <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex flex-col items-center justify-center gap-1 hover:bg-white/10 transition-colors">
                                    <span className="text-2xl font-bold text-white">{dailyStats.resets}</span>
                                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Resets</span>
                                </div>

                                {/* Completed Notes */}
                                <div className="col-span-2 bg-gradient-to-br from-green-500/10 to-teal-500/10 border border-white/5 rounded-2xl p-4 flex items-center justify-between px-6 hover:border-green-500/30 transition-colors">
                                    <span className="text-xs font-bold text-green-400 uppercase tracking-widest">Notes Completed</span>
                                    <span className="text-2xl font-bold text-white">{dailyStats.completedNotes}</span>
                                </div>
                            </div>

                            <div className="mt-6 text-center">
                                <p className="text-[10px] text-white/20 font-medium">Stats reset automatically at midnight.</p>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Footer */}
            <div className="border-t border-white/5 py-3 text-center">
                <p className="text-xs text-white/30 font-medium">
                    Made With <span className="text-red-400">❤️</span> By Sanket
                </p>
            </div>

            {/* Snackbar */}
            {
                snackbar && (
                    <Snackbar
                        message={snackbar.message}
                        type={snackbar.type}
                        onClose={() => setSnackbar(null)}
                    />
                )
            }
        </div >
    );
}
