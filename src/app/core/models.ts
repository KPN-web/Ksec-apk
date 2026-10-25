export interface AuthResponse {
  token: string;
  fullName: string;
  email: string;
  role: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  fullName: string;
  email: string;
  password: string;
}

export interface AgendaItem {
  title: string;
  description: string | null;
}

export interface Participant {
  name: string;
  jobTitle: string | null;
  present: boolean;
}

export type MeetingStatus = 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED';

export interface Meeting {
  id: number;
  theme: string;
  meetingDate: string;
  location: string | null;
  notes: string | null;
  transcript: string | null;
  status: MeetingStatus;
  agendaItems: AgendaItem[];
  participants: Participant[];
  createdAt: string;
}

export type MeetingRequest = Omit<Meeting, 'id' | 'status' | 'createdAt' | 'transcript'>;

export const STATUS_LABELS: Record<MeetingStatus, string> = {
  DRAFT: 'Préparée',
  IN_PROGRESS: 'En cours',
  COMPLETED: 'Terminée',
};

export interface GeneratedDocument {
  id: number;
  type: string;
  content: string;
  createdAt: string;
}
