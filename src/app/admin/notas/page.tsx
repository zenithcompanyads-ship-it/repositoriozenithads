import NotesBlock from '@/components/admin/NotesBlock';

export default function NotasPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="px-4 sm:px-6 lg:px-8 py-8 sm:py-12 border-b border-gray-200 bg-white m-0 rounded-none">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 m-0">
          Notas
        </h1>
        <p className="text-sm text-gray-600 font-light mt-3">
          Seu bloco de anotações pessoal
        </p>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <NotesBlock />
      </div>
    </div>
  );
}
