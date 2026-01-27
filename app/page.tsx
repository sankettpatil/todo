import NoteGrid from '@/components/NoteGrid';

export default function Home() {
  return (
    <main className="min-h-screen py-6 px-4 relative overflow-hidden">
      <div className="w-full h-full">
        {/* Title removed or moved to Create Panel to save space in split view */}
        <NoteGrid />
      </div>
    </main>
  );
}
