'use client';

import type { Entry } from '@/lib/supabase';
import { getParticipantName } from '@/lib/participants';
import { formatDateEST } from '@/lib/dateUtils';

interface DuplicateComparisonModalProps {
  existingEntry: Entry;
  proposedContent: string;
  proposedParticipantId: string;
  proposedDefinition: string;
  proposedPronunciation: string;
  proposedPartOfSpeech: string;
  proposedEtymology: string;
  onProceed: () => void;
  onCancel: () => void;
}

/**
 * Modal component for comparing a proposed word entry with an existing one.
 * Shows side-by-side comparison and allows user to proceed or cancel.
 */
export default function DuplicateComparisonModal({
  existingEntry,
  proposedContent,
  proposedParticipantId,
  proposedDefinition,
  proposedPronunciation,
  proposedPartOfSpeech,
  proposedEtymology,
  onProceed,
  onCancel,
}: DuplicateComparisonModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">Word Already Exists</h2>
        <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
          The word &quot;<strong>{proposedContent}</strong>&quot; already exists in the database. Compare the entries below:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
          {/* Existing Entry */}
          <div className="border border-gray-300 rounded p-4 bg-gray-50">
            <h3 className="font-bold text-lg mb-3 text-gray-700">Existing Entry</h3>
            <div className="space-y-2 text-sm">
              <p><span className="font-semibold">Submitted by:</span> {getParticipantName(existingEntry.participant_id)}</p>
              <p><span className="font-semibold">Date:</span> {formatDateEST(existingEntry.created_at)}</p>
              {existingEntry.word_metadata?.[0] && (
                <>
                  <p><span className="font-semibold">Pronunciation:</span> {existingEntry.word_metadata[0].pronunciation_respelling || existingEntry.word_metadata[0].pronunciation_ipa || existingEntry.word_metadata[0].pronunciation || 'N/A'}</p>
                  <p><span className="font-semibold">Part of Speech:</span> {existingEntry.word_metadata[0].part_of_speech || 'N/A'}</p>
                  <div>
                    <span className="font-semibold">Definition:</span>
                    <p className="mt-1 text-gray-700">{existingEntry.word_metadata[0].definition || 'N/A'}</p>
                  </div>
                  {existingEntry.word_metadata[0].etymology && (
                    <div>
                      <span className="font-semibold">Etymology:</span>
                      <p className="mt-1 text-gray-700">{existingEntry.word_metadata[0].etymology}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Proposed Entry */}
          <div className="border border-blue-300 rounded p-4 bg-blue-50">
            <h3 className="font-bold text-lg mb-3 text-blue-700">Proposed Entry</h3>
            <div className="space-y-2 text-sm">
              <p><span className="font-semibold">Submitted by:</span> {getParticipantName(proposedParticipantId)}</p>
              <p><span className="font-semibold">Date:</span> {formatDateEST(new Date())}</p>
              <p><span className="font-semibold">Pronunciation:</span> {proposedPronunciation || 'N/A'}</p>
              <p><span className="font-semibold">Part of Speech:</span> {proposedPartOfSpeech || 'N/A'}</p>
              <div>
                <span className="font-semibold">Definition:</span>
                <p className="mt-1 text-gray-700">{proposedDefinition || 'N/A'}</p>
              </div>
              {proposedEtymology && (
                <div>
                  <span className="font-semibold">Etymology:</span>
                  <p className="mt-1 text-gray-700">{proposedEtymology}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 sm:px-6 py-2.5 bg-gray-500 text-white font-semibold rounded hover:bg-gray-600 text-sm sm:text-base"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onProceed}
            className="px-4 sm:px-6 py-2.5 bg-blue-600 text-white font-semibold rounded hover:bg-blue-700 text-sm sm:text-base"
          >
            Proceed with New Entry
          </button>
        </div>
      </div>
    </div>
  );
}
