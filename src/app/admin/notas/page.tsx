import NotesBlock from '@/components/admin/NotesBlock';

export default function NotasPage() {
  return (
    <div className="min-h-screen">
      <div className="px-4 sm:px-6 lg:px-8 py-8 sm:py-12 border-b border-white/10 glass-card m-0 rounded-none animate-fade-in">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white m-0">
          Notas
        </h1>
        <p className="text-sm text-white/60 font-light mt-3">
          Seu bloco de anotações pessoal
        </p>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <NotesBlock />
      </div>
    </div>
  );
}
