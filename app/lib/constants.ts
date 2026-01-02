export const DEMO_USER_ID = '550e8400-e29b-41d4-a716-446655440000';

export interface Participant {
  id: string;
  name: string;
}

export const PARTICIPANTS: Participant[] = [
  { id: 'participant-1', name: 'Brian Mickley' },
  { id: 'participant-2', name: 'Erik Beachy' },
  { id: 'participant-3', name: 'Ryan Mann'},
];

export const STORAGE_KEY_SELECTED_PARTICIPANT = 'qotd-wod-selected-participant';

