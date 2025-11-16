// TypeScript types for the CCSF Tutoring AI Agent

export type TutorMode = 'online' | 'on campus';

export interface Tutor {
  id: number;
  name: string;
  pronouns: string | null;
  bio: string;
  mode: TutorMode;
  skills: string[];
  availability: AvailabilitySlot[];
}

export interface AvailabilitySlot {
  day: string;
  time: string;
  mode: TutorMode;
}

export interface Skill {
  id: number;
  name: string;
}

export interface TutorSkill {
  tutor_id: number;
  skill_id: number;
}

export interface Availability {
  id?: number;
  tutor_id: number;
  day: string;
  time: string;
  mode: TutorMode;
}

export interface TutorWithRelations {
  id: number;
  name: string;
  pronouns: string | null;
  bio: string;
  mode: TutorMode;
  skills: Skill[];
  availability: Availability[];
}

// API Request/Response Types
export interface MatchTutorRequest {
  skill: string | string[];
  day?: string;
  time?: string;
  mode?: TutorMode;
}

export interface MatchTutorResponse {
  tutor: Tutor;
  matchScore: number;
  reasoning: string;
  availableSlots: AvailabilitySlot[];
}

export interface BookSessionRequest {
  tutorId: number;
  day: string;
  time: string;
  studentName: string;
  studentEmail: string;
  ccsfEmail: string; // @mail.ccsf.edu email
  studentId?: string; // CCSF student ID number
  allowOtherStudents?: boolean; // Are you okay with other students joining?
  classes?: string[]; // Course codes (110A, 110B, etc.)
  specificHelp?: string; // What specifically do you need help with?
  additionalNotes?: string; // Anything else the tutor should know?
  topic?: string;
}

export interface BookSessionResponse {
  success: boolean;
  calendlyUrl?: string;
  automationStatus?: 'pending' | 'completed' | 'failed';
  sessionDetails: {
    tutor: string;
    day: string;
    time: string;
    mode: TutorMode;
  };
  message?: string;
}

// Course mapping for Calendly form
export const COURSE_MAPPING: Record<string, string> = {
  '110A': '110A',
  '110B': '110B',
  '110C': '110C',
  '111B': '111B',
  '111C': '111C',
  '131B': '131B',
  '150A': '150A',
  '155P': '155P',
  '160A': '160A',
  '160B': '160B',
  '195': '195',
  '199': '199',
  '211D': '211D',
  '211S': '211S',
  '231': '231',
  '256': '256',
  '260A': '260A',
  '270': '270',
  'MATH 108': 'MATH 108',
  'MATH 115': 'MATH 115',
  'Other': 'Other',
};

export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
}

