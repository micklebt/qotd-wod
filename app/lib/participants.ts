import { PARTICIPANTS, type Participant } from './constants';

export function getParticipantName(userId: string): string {
  const participant = PARTICIPANTS.find(p => p.id === userId);
  return participant?.name || userId;
}

export function getParticipantById(userId: string): Participant | undefined {
  return PARTICIPANTS.find(p => p.id === userId);
}

