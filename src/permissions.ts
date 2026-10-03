import type { User } from './types';

// Explicit permission model — UI must call these, not just hide buttons.
export const isOwner = (u: User | null) => !!u && u.role === 'owner';
export const isAdmin = (u: User | null) => !!u && (u.role === 'admin' || u.role === 'owner');
export const isTeacher = (u: User | null) => !!u && (u.role === 'teacher' || u.role === 'admin' || u.role === 'owner');
export const canCreateAssignment = (u: User | null) => !!u && ['teacher', 'admin', 'owner'].includes(u.role);
export const canMarkAssignment = (u: User | null) => canCreateAssignment(u);
export const canManageSchool = (u: User | null) => !!u && ['admin', 'owner'].includes(u.role);
export const canCreatePlatformAnnouncement = (u: User | null) => isOwner(u);
export const canCreateSchoolAnnouncement = (u: User | null) => !!u && ['admin', 'teacher', 'owner'].includes(u.role);
export const canAwardBehaviour = (u: User | null) => !!u && ['teacher', 'admin', 'owner'].includes(u.role);
export const canTakeAttendance = (u: User | null) => !!u && ['teacher', 'admin', 'owner'].includes(u.role);
export const canHostQuiz = (u: User | null) => !!u && ['teacher', 'admin', 'owner'].includes(u.role);
export const canManageUsers = (u: User | null) => canManageSchool(u);
export const canManageFiles = (u: User | null) => !!u && ['teacher', 'admin', 'owner'].includes(u.role);
export function canViewStudent(viewer: User | null, studentId: string): boolean {
  if (!viewer) return false;
  if (viewer.role === 'owner' || viewer.role === 'admin') return true;
  if (viewer.role === 'parent') return (viewer.linkedStudentIds ?? []).includes(studentId);
  if (viewer.role === 'teacher') return true; // scoped by class in queries
  return viewer.id === studentId;
}
// Messaging safety: students may message teachers/classes only — never direct student↔student.
export function canMessage(from: User | null, to: User | null, classContext = false): boolean {
  if (!from || !to) return false;
  if (from.role === 'student' && to.role === 'student') return classContext; // only via class channel
  return true;
}
