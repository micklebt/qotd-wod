import EntryForm from '@/components/EntryForm';

export default function NewEntryPage() {
  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Add New Entry</h1>
      <EntryForm />
    </div>
  );
}