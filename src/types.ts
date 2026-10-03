export type Role = 'owner' | 'admin' | 'teacher' | 'student' | 'parent';

export interface School {
  id: string; name: string; logo: string;
  primaryColor: string; secondaryColor: string; accentColor: string;
  address: string; phone: string; contactEmail: string; website: string;
  timezone: string; description: string; termDates: string;
  enabled: boolean;
  enabledFeatures: string[]; navOrder: string[];
  studentModules: string[]; parentModules: string[];
  behaviourCategories: { positive: string[]; negative: string[] };
}

export interface User {
  id: string; schoolId: string | null; role: Role;
  name: string; email: string; password: string;
  disabled?: boolean; classIds: string[];
  linkedStudentIds?: string[]; // parents
  yearGroup?: string;
}

export interface ClassGroup {
  id: string; schoolId: string; name: string; subject: string;
  yearGroup: string; teacherIds: string[]; studentIds: string[];
}

export interface TimetableEntry {
  id: string; schoolId: string; day: string;
  start: string; end: string; subject: string;
  teacherId: string; room: string; classId: string;
  status?: 'normal' | 'cancelled' | 'cover' | 'room-change';
  note?: string;
}

export interface Assignment {
  id: string; schoolId: string; title: string; description: string;
  instructions: string; subject: string; classId: string;
  dueDate: string; points: number; rubric: string;
  visible: boolean; allowResubmit: boolean; attachmentNames: string[];
}

export interface Submission {
  id: string; schoolId: string; assignmentId: string; studentId: string;
  text: string; fileNames: string[]; status: 'not-started' | 'in-progress' | 'submitted' | 'returned' | 'late' | 'missing';
  grade?: number; feedback?: string; feedbackReplies: { from: string; text: string; time: string }[];
  updatedAt: string;
}

export interface Conversation {
  id: string; schoolId: string; kind: 'direct' | 'assignment' | 'class' | 'announcement';
  title: string; memberIds: string[]; classId?: string; assignmentId?: string;
}

export interface Message {
  id: string; schoolId: string; conversationId: string;
  senderId: string; text: string; time: string; readBy: string[];
  attachmentName?: string; reported?: boolean;
}

export interface Announcement {
  id: string; schoolId: string | null; // null = platform
  scope: 'platform' | 'school';
  kind: string; title: string; body: string;
  author: string; date: string; priority: 'low' | 'normal' | 'high' | 'urgent';
  audience: string; targetClassId?: string;
}

export interface Notification {
  id: string; schoolId: string | null; userId: string;
  text: string; link: string; time: string; read: boolean;
}

export interface BehaviourRecord {
  id: string; schoolId: string; studentId: string; teacherId: string;
  kind: 'positive' | 'negative'; category: string; points: number;
  note: string; date: string;
}

export interface Reward { id: string; schoolId: string; name: string; cost: number; desc: string; }
export interface Detention {
  id: string; schoolId: string; studentId: string; staffId: string;
  date: string; time: string; location: string; reason: string; done: boolean;
}

export interface AttendanceRecord {
  id: string; schoolId: string; studentId: string; date: string;
  status: 'present' | 'late' | 'absent' | 'authorised' | 'unauthorised';
}

export interface Question {
  id: string; kind: 'mc' | 'tf' | 'short';
  text: string; choices: string[]; answer: number | string; points: number;
}

export interface Quiz {
  id: string; schoolId: string; title: string; subject: string;
  classId: string; questions: Question[];
  timerSec: number; randomQ: boolean; randomA: boolean;
}

export interface QuizSession {
  id: string; schoolId: string; quizId: string; code: string;
  mode: 'classic' | 'race' | 'castle' | 'tycoon' | 'space';
  status: 'lobby' | 'live' | 'ended'; participants: string[];
  leaderboard: { studentId: string; score: number; correct: number }[];
  questionIndex: number;
}

export interface QuizResult {
  id: string; schoolId: string; quizId: string; sessionId?: string;
  studentId: string; score: number; correct: number; total: number;
  accuracy: number; timeSec: number; date: string; missed: string[];
}

export interface FileAsset {
  id: string; schoolId: string; folder: string; name: string;
  kind: 'resource' | 'submission'; ownerId: string; size: string;
  content: string; classId?: string; date: string;
}

export type ModuleKey = 'dashboard' | 'timetable' | 'assignments' | 'classes' | 'quizzes' | 'behaviour' | 'attendance' | 'messages' | 'files' | 'announcements' | 'notifications';
