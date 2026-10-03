import type { School, User, ClassGroup, TimetableEntry, Assignment, Submission, Conversation, Message, Announcement, Notification, BehaviourRecord, Reward, Detention, AttendanceRecord, Quiz, QuizResult, FileAsset } from './types';

export interface Seed { schools: School[]; users: User[]; classes: ClassGroup[]; timetable: TimetableEntry[]; assignments: Assignment[]; submissions: Submission[]; conversations: Conversation[]; messages: Message[]; announcements: Announcement[]; notifications: Notification[]; behaviour: BehaviourRecord[]; rewards: Reward[]; detentions: Detention[]; attendance: AttendanceRecord[]; quizzes: Quiz[]; results: QuizResult[]; files: FileAsset[]; }

const FEATS = ['timetable', 'assignments', 'behaviour', 'attendance', 'quizzes', 'messages', 'files', 'announcements'];

export function seed(): Seed {
  const schools: School[] = [
    {
      id: 'sch-example', name: 'Example Academy', logo: '🏫',
      primaryColor: '#1d4ed8', secondaryColor: '#0f172a', accentColor: '#f59e0b',
      address: '1 School Lane, Demo Town', phone: '01234 567890', contactEmail: 'office@example.local',
      website: 'example.schoolos.local', timezone: 'Europe/London',
      description: 'A friendly fictional demo school.', termDates: 'Sep 1 – Dec 19 (demo)',
      enabled: true, enabledFeatures: FEATS,
      navOrder: ['dashboard', 'timetable', 'assignments', 'classes', 'quizzes', 'behaviour', 'attendance', 'messages', 'files', 'announcements', 'notifications'],
      studentModules: FEATS, parentModules: ['timetable', 'assignments', 'behaviour', 'attendance', 'messages', 'announcements'],
      behaviourCategories: { positive: ['Great effort', 'Excellent homework', 'Helping others', 'Outstanding work'], negative: ['Late', 'Missing equipment', 'Disruption', 'Uniform issue'] },
    },
    {
      id: 'sch-riverside', name: 'Riverside High', logo: '🌊',
      primaryColor: '#0d9488', secondaryColor: '#134e4a', accentColor: '#fb7185',
      address: '5 River Rd, Demo City', phone: '09876 543210', contactEmail: 'hello@riverside.local',
      website: 'riverside.schoolos.local', timezone: 'Europe/London',
      description: 'Second fictional school proving isolation.', termDates: 'Sep 1 – Dec 19 (demo)',
      enabled: true, enabledFeatures: FEATS,
      navOrder: ['dashboard', 'timetable', 'assignments', 'quizzes', 'messages', 'announcements', 'notifications'],
      studentModules: FEATS, parentModules: ['timetable', 'assignments', 'announcements'],
      behaviourCategories: { positive: ['Teamwork', 'Creativity', 'Persistence'], negative: ['Late', 'Disruption'] },
    },
  ];
  const users: User[] = [
    { id: 'u-owner', schoolId: null, role: 'owner', name: 'Platform Owner', email: 'owner@schoolos.local', password: 'demo', classIds: [] },
    { id: 'u-admin1', schoolId: 'sch-example', role: 'admin', name: 'A. Admin', email: 'admin@example.local', password: 'demo', classIds: [] },
    { id: 'u-smith', schoolId: 'sch-example', role: 'teacher', name: 'Ms Smith', email: 'smith@example.local', password: 'demo', classIds: ['c-10a'] },
    { id: 'u-jones', schoolId: 'sch-example', role: 'teacher', name: 'Mr Jones', email: 'jones@example.local', password: 'demo', classIds: ['c-9b'] },
    { id: 'u-alex', schoolId: 'sch-example', role: 'student', name: 'Alex Smith', email: 'alex@example.local', password: 'demo', classIds: ['c-10a'], yearGroup: 'Year 10' },
    { id: 'u-mia', schoolId: 'sch-example', role: 'student', name: 'Mia Patel', email: 'mia@example.local', password: 'demo', classIds: ['c-10a'], yearGroup: 'Year 10' },
    { id: 'u-parent', schoolId: 'sch-example', role: 'parent', name: 'Sam Smith (parent)', email: 'parent@example.local', password: 'demo', classIds: [], linkedStudentIds: ['u-alex'] },
    { id: 'u-admin2', schoolId: 'sch-riverside', role: 'admin', name: 'R. Admin', email: 'admin@riverside.local', password: 'demo', classIds: [] },
    { id: 'u-riv-t', schoolId: 'sch-riverside', role: 'teacher', name: 'Ms River', email: 'river@riverside.local', password: 'demo', classIds: ['c-r1'] },
    { id: 'u-riv-s', schoolId: 'sch-riverside', role: 'student', name: 'Rio Lane', email: 'rio@riverside.local', password: 'demo', classIds: ['c-r1'], yearGroup: 'Year 9' },
  ];
  const classes: ClassGroup[] = [
    { id: 'c-10a', schoolId: 'sch-example', name: '10A Maths', subject: 'Mathematics', yearGroup: 'Year 10', teacherIds: ['u-smith'], studentIds: ['u-alex', 'u-mia'] },
    { id: 'c-9b', schoolId: 'sch-example', name: '9B English', subject: 'English', yearGroup: 'Year 9', teacherIds: ['u-jones'], studentIds: ['u-alex'] },
    { id: 'c-r1', schoolId: 'sch-riverside', name: '9R Science', subject: 'Science', yearGroup: 'Year 9', teacherIds: ['u-riv-t'], studentIds: ['u-riv-s'] },
  ];
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const timetable: TimetableEntry[] = [];
  const subs = [['09:00', '10:00', 'Mathematics', 'u-smith', 'Room 204', 'c-10a'], ['10:00', '11:00', 'English', 'u-jones', 'Room 17', 'c-9b'], ['11:20', '12:20', 'Science', 'u-smith', 'Lab 2', 'c-10a']];
  days.forEach(d => subs.forEach((s, i) => timetable.push({ id: `t-${d}-${i}`, schoolId: 'sch-example', day: d, start: s[0], end: s[1], subject: s[2], teacherId: s[3], room: s[4], classId: s[5], status: d === 'Wed' && i === 2 ? 'cover' : 'normal', note: d === 'Wed' && i === 2 ? 'Cover: Mr Jones' : undefined })));
  timetable.push({ id: 't-r1', schoolId: 'sch-riverside', day: 'Mon', start: '09:00', end: '10:00', subject: 'Science', teacherId: 'u-riv-t', room: 'Lab 1', classId: 'c-r1', status: 'normal' });
  const assignments: Assignment[] = [
    { id: 'a-math1', schoolId: 'sch-example', title: 'Maths Worksheet — Algebra', description: 'Linear equations practice.', instructions: 'Show working for Q1–10. Upload photo or type answers.', subject: 'Mathematics', classId: 'c-10a', dueDate: '2026-10-06', points: 10, rubric: '2 pts method, 1 pt accuracy per section', visible: true, allowResubmit: true, attachmentNames: ['algebra-sheet.pdf'] },
    { id: 'a-eng1', schoolId: 'sch-example', title: 'English Essay — Persuasion', description: '300-word persuasive paragraph.', instructions: 'Use PEE structure. Draft in your own words.', subject: 'English', classId: 'c-9b', dueDate: '2026-10-10', points: 20, rubric: 'Ideas 10, Language 10', visible: true, allowResubmit: false, attachmentNames: [] },
  ];
  const submissions: Submission[] = [
    { id: 's-1', schoolId: 'sch-example', assignmentId: 'a-math1', studentId: 'u-alex', text: 'x=3 for Q1… (demo)', fileNames: [], status: 'submitted', feedbackReplies: [], updatedAt: 'today' },
  ];
  const conversations: Conversation[] = [
    { id: 'conv-smith-alex', schoolId: 'sch-example', kind: 'direct', title: 'Ms Smith ↔ Alex Smith', memberIds: ['u-smith', 'u-alex'] },
    { id: 'conv-10a', schoolId: 'sch-example', kind: 'class', title: '10A Maths — class channel', memberIds: ['u-smith', 'u-alex', 'u-mia'], classId: 'c-10a' },
  ];
  const messages: Message[] = [
    { id: 'm-1', schoolId: 'sch-example', conversationId: 'conv-smith-alex', senderId: 'u-smith', text: 'Nice start on algebra — check Q7 working.', time: 'Mon 15:20', readBy: ['u-smith'] },
    { id: 'm-2', schoolId: 'sch-example', conversationId: 'conv-10a', senderId: 'u-smith', text: 'Reminder: worksheet due Monday 📝', time: 'Tue 09:00', readBy: ['u-smith'] },
  ];
  const announcements: Announcement[] = [
    { id: 'pa-1', schoolId: null, scope: 'platform', kind: 'Update', title: 'SchoolOS 2.4 released', body: 'New quiz modes (Race, Castle, Tycoon, Space), faster dashboard, improved submissions.', author: 'SchoolOS Team', date: '2026-10-01', priority: 'normal', audience: 'everyone' },
    { id: 'pa-2', schoolId: null, scope: 'platform', kind: 'Maintenance', title: 'Maintenance Sunday 02:00–03:00', body: 'Brief demo downtime window (fictional).', author: 'SchoolOS Team', date: '2026-09-28', priority: 'high', audience: 'all-schools' },
    { id: 'sa-1', schoolId: 'sch-example', scope: 'school', kind: 'Event', title: 'Year 10 Parents Evening Thursday', body: 'Bookings via office (demo). Hall A, 4–7pm.', author: 'A. Admin', date: '2026-10-02', priority: 'normal', audience: 'parents' },
    { id: 'sa-2', schoolId: 'sch-example', scope: 'school', kind: 'Important', title: 'Library closed Friday PM', body: 'Stock-take (demo).', author: 'A. Admin', date: '2026-10-02', priority: 'high', audience: 'whole-school' },
  ];
  const notifications: Notification[] = [
    { id: 'n-1', schoolId: 'sch-example', userId: 'u-alex', text: 'Ms Smith replied to your assignment', link: 'assignments', time: 'today', read: false },
    { id: 'n-2', schoolId: 'sch-example', userId: 'u-alex', text: 'New homework posted: Algebra', link: 'assignments', time: 'today', read: false },
    { id: 'n-3', schoolId: 'sch-example', userId: 'u-alex', text: 'New school announcement', link: 'announcements', time: 'today', read: false },
  ];
  const behaviour: BehaviourRecord[] = [
    { id: 'b-1', schoolId: 'sch-example', studentId: 'u-alex', teacherId: 'u-smith', kind: 'positive', category: 'Great effort', points: 2, note: 'Lovely working in algebra', date: 'today' },
    { id: 'b-2', schoolId: 'sch-example', studentId: 'u-mia', teacherId: 'u-smith', kind: 'positive', category: 'Helping others', points: 3, note: 'Helped partner', date: 'yesterday' },
  ];
  const rewards: Reward[] = [
    { id: 'r-1', schoolId: 'sch-example', name: 'Homework pass', cost: 500, desc: 'Skip one homework (demo).' },
    { id: 'r-2', schoolId: 'sch-example', name: 'School reward', cost: 1000, desc: 'Canteen voucher (demo).' },
  ];
  const detentions: Detention[] = [];
  const attendance: AttendanceRecord[] = [
    { id: 'at-1', schoolId: 'sch-example', studentId: 'u-alex', date: '2026-10-01', status: 'present' },
    { id: 'at-2', schoolId: 'sch-example', studentId: 'u-alex', date: '2026-10-02', status: 'present' },
    { id: 'at-3', schoolId: 'sch-example', studentId: 'u-alex', date: '2026-10-03', status: 'late' },
    { id: 'at-4', schoolId: 'sch-example', studentId: 'u-mia', date: '2026-10-03', status: 'present' },
  ];
  const quizzes: Quiz[] = [
    {
      id: 'q-alg', schoolId: 'sch-example', title: 'Y10 Algebra Quiz', subject: 'Mathematics', classId: 'c-10a',
      timerSec: 60, randomQ: true, randomA: false,
      questions: [
        { id: 'qq1', kind: 'mc', text: 'Solve: 2x = 10', choices: ['x=2', 'x=5', 'x=10', 'x=20'], answer: 1, points: 10 },
        { id: 'qq2', kind: 'tf', text: 'x + x = 2x', choices: ['True', 'False'], answer: 0, points: 10 },
        { id: 'qq3', kind: 'short', text: 'Simplify: 3a + 4a', choices: [], answer: '7a', points: 10 },
      ],
    },
  ];
  const results: QuizResult[] = [];
  const files: FileAsset[] = [
    { id: 'f-1', schoolId: 'sch-example', folder: '10A Maths', name: 'algebra-sheet.pdf', kind: 'resource', ownerId: 'u-smith', size: '120 KB', content: 'Demo worksheet text: solve 10 linear equations. (fictional)', classId: 'c-10a', date: 'Mon' },
  ];
  return { schools, users, classes, timetable, assignments, submissions, conversations, messages, announcements, notifications, behaviour, rewards, detentions, attendance, quizzes, results, files };
}
