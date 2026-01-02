import EntryForm from '@/components/EntryForm';

export default function NewEntryPage() {
  return (
    <div className="max-w-2xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
      <h1 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">Add New Entry</h1>
      <EntryForm />
    </div>
  );
}