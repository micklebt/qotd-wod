# Pronunciation Format Implementation

## Requirements
Store both pronunciation formats in the database and display the respelling format (the "normal looking" option).

### Formats:
1. **pronunciation_respelling**: Dictionary-style respelling using A–Z, hyphen, and parentheses. Capitalize the stressed syllable (example: MYND-fuhl)
2. **pronunciation_ipa**: IPA for General American wrapped in / /, using ˈ for primary stress, ˌ for secondary stress, and . between syllables (example: /ˈmaɪnd.fəl/)

## Implementation Plan

### Phase 1: Database Schema (DONE)
- Created migration file: `add_pronunciation_fields.sql`
- Adds `pronunciation_respelling` and `pronunciation_ipa` fields to `word_metadata` table
- Migrates existing `pronunciation` data to `pronunciation_ipa`

### Phase 2: TypeScript Interfaces (IN PROGRESS)
- Update `Entry` interface in `app/lib/supabase.ts` to include new fields
- Update `lookupWord` return type in `app/lib/dictionary.ts`

### Phase 3: Dictionary Lookup (IN PROGRESS)
- Update `lookupWord` to return both formats
- Format IPA properly (brackets, stress marks, syllable separators)
- Note: Dictionary API only provides IPA, so respelling will be undefined initially

### Phase 4: EntryForm Component
- Add state variables for `pronunciationRespelling` and `pronunciationIpa`
- Update lookup handler to set both fields
- Add input field for respelling (for manual entry)
- Display respelling format (fallback to IPA if respelling not available)
- Update submit/update logic to save both fields

### Phase 5: Display Components
- Update entry display pages to show respelling format
- Update WordChallenge component
- Update EntryCard component
- Update entry edit page

### Phase 6: IPA to Respelling Conversion (FUTURE)
- Consider implementing automatic conversion from IPA to respelling
- Or use a service/API for conversion
- For now, respelling can be entered manually

## Notes
- The dictionary API (dictionaryapi.dev) only provides IPA format
- Automatic conversion from IPA to respelling is complex and error-prone
- Initial implementation will store IPA and allow manual entry of respelling
- Display will prioritize respelling, falling back to IPA if respelling is not available


