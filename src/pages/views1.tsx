import { useMemo, useState } from 'react';
import { useApp, uid } from '../store';
import { Card, Stat, Field, Modal, Bars, Empty } from '../components/ui';
import { canCreateAssignment, canMarkAssignment, canTakeAttendance, isAdmin } from '../permissions';
import type { Assignment, Submission, TimetableEntry, ClassGroup } from '../types';

/* ---------- helpers ---------- */
export function userName(app: ReturnType<typeof useApp>, id: string) {
  return app.users.find(u => u.id === id)?.name ?? '—';
}
function todayDay() {
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date().getDay()];
}
function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'GOOD MORNING' : h < 18 ? 'GOOD AFTERNOON' : 'GOOD EVENING';
}

/* ---------- DASHBOARDS ---------- */
export function Dashboard() {
  const app = useApp();
  const u = app.user!;
  if (u.role === 'owner') return <OwnerDash />;
  if (u.role === 'admin') return <AdminDash />;
  if (u.role === 'teacher') return <TeacherDash />;
  if (u.role === 'parent') return <ParentDash />;
  return <StudentDash />;
}

function useScopedStudents(): string[] {
  const app = useApp();
  const u = app.user!;
  if (u.role === 'student') return [u.id];
  if (u.role === 'parent') return u.linkedStudentIds ?? [];
  if (u.role === 'teacher') {
    const mine = app.classes.filter(c => c.teacherIds.includes(u.id) && c.schoolId === u.schoolId);
    return [...new Set(mine.flatMap(c => c.studentIds))];
  }
  return app.users.filter(x => x.schoolId === u.schoolId && x.role === 'student' && !x.disabled).map(x => x.id);
}

function StudentDash() {
  const app = useApp();
  const u = app.user!;
  const kids = useScopedStudents();
  const sid = kids[0];
  const day = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].includes(todayDay()) ? todayDay() : 'Mon';
  const today = app.timetable.filter(t => t.schoolId === u.schoolId && t.day === day && (app.classes.find(c => c.id === t.classId)?.studentIds ?? []).includes(sid));
  const mySubs = app.submissions.filter(s => s.studentId === sid && s.schoolId === u.schoolId);
  const open = app.assignments.filter(a => a.schoolId === u.schoolId && a.visible && app.classes.find(c => c.id === a.classId)?.studentIds.includes(sid) && !mySubs.find(s => s.assignmentId === a.id && ['submitted', 'returned'].includes(s.status)));
  const pts = app.behaviour.filter(b => b.studentId === sid).reduce((s, b) => s + b.points, 0);
  const att = app.attendance.filter(a => a.studentId === sid);
  const pct = att.length ? Math.round((att.filter(a => a.status === 'present').length / att.length) * 100) : 100;
  const unread = app.messages.filter(m => m.schoolId === u.schoolId && !m.readBy.includes(u.id) && app.conversations.find(c => c.id === m.conversationId)?.memberIds.includes(u.id)).length;
  const anns = app.announcements.filter(a => a.schoolId === u.schoolId || (a.scope === 'platform'));
  return (
    <div>
      <h2>{greeting()}, {u.name.split(' ')[0]}</h2>
      <div className="grid g4">
        <Stat label="Today's lessons" value={today.length} sub={today.map(t => t.subject).join(' · ') || 'No lessons'} />
        <Stat label="Upcoming work" value={open.length} sub={open[0]?.title ?? 'All caught up 🎉'} />
        <Stat label="Behaviour" value={(pts >= 0 ? '+' : '') + pts + ' pts'} sub="This term" />
        <Stat label="Attendance" value={pct + '%'} sub={`${att.length} records`} />
      </div>
      <div className="grid g2" style={{ marginTop: 14 }}>
        <Card title="📅 TODAY">
          {today.length === 0 ? <Empty text="No lessons today." /> : today.map(t => (
            <div key={t.id} className="row" style={{ justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
              <span><b>{t.start}</b> · {t.subject} · {t.room}</span>
              {t.status !== 'normal' && <span className="badge">{t.status}: {t.note}</span>}
            </div>
          ))}
        </Card>
        <Card title="📝 UPCOMING WORK" action={<button className="btn sm" onClick={() => app.setView('assignments')}>Open</button>}>
          {open.slice(0, 4).map(a => <div key={a.id}>• <b>{a.title}</b> <span className="muted small">due {a.dueDate}</span></div>)}
          {open.length === 0 && <Empty text="Nothing due. 🎉" />}
        </Card>
        <Card title="💬 MESSAGES" action={<button className="btn sm" onClick={() => app.setView('messages')}>Open</button>}><b>{unread}</b> unread</Card>
        <Card title="📢 ANNOUNCEMENTS" action={<button className="btn sm" onClick={() => app.setView('announcements')}>Open</button>}><b>{anns.length}</b> notices (school + SchoolOS)</Card>
      </div>
    </div>
  );
}

function TeacherDash() {
  const app = useApp();
  const u = app.user!;
  const day = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].includes(todayDay()) ? todayDay() : 'Mon';
  const mine = app.classes.filter(c => c.schoolId === u.schoolId && c.teacherIds.includes(u.id));
  const today = app.timetable.filter(t => t.schoolId === u.schoolId && t.day === day && t.teacherId === u.id);
  const pending = app.submissions.filter(s => s.schoolId === u.schoolId && s.status === 'submitted' && app.assignments.find(a => a.id === s.assignmentId && mine.find(c => c.id === a.classId)));
  const unread = app.messages.filter(m => m.schoolId === u.schoolId && !m.readBy.includes(u.id)).length;
  const upcoming = app.quizzes.filter(q => q.schoolId === u.schoolId);
  return (
    <div>
      <h2>{greeting()}, {u.name}</h2>
      <div className="grid g4">
        <Stat label="Today's lessons" value={today.length} sub={today.map(t => t.start + ' ' + t.subject).join(' · ') || '—'} />
        <Stat label="Pending marking" value={pending.length} sub="submissions" />
        <Stat label="Messages" value={unread} sub="unread in your channels" />
        <Stat label="Quizzes" value={upcoming.length} sub={upcoming[0]?.title ?? 'none yet'} />
      </div>
      <div className="grid g2" style={{ marginTop: 14 }}>
        <Card title="📅 TODAY">{today.map(t => <div key={t.id}><b>{t.start}</b> — {app.classes.find(c => c.id === t.classId)?.name} · {t.room}</div>)}{today.length === 0 && <Empty text="No lessons today." />}</Card>
        <Card title="📝 PENDING MARKING" action={<button className="btn sm" onClick={() => app.setView('assignments')}>Mark</button>}>{pending.length} submissions awaiting feedback.</Card>
      </div>
    </div>
  );
}

function AdminDash() {
  const app = useApp();
  const u = app.user!;
  const sid = u.schoolId!;
  const students = app.users.filter(x => x.schoolId === sid && x.role === 'student' && !x.disabled);
  const teachers = app.users.filter(x => x.schoolId === sid && x.role === 'teacher' && !x.disabled);
  const att = app.attendance.filter(a => a.schoolId === sid);
  const pres = att.length ? Math.round(att.filter(a => a.status === 'present').length / att.length * 100) : 100;
  const pts = app.behaviour.filter(b => b.schoolId === sid).reduce((s, b) => s + b.points, 0);
  return (
    <div>
      <h2>{app.mySchool()?.logo} {app.mySchool()?.name} — admin overview</h2>
      <div className="grid g4">
        <Stat label="Students" value={students.length} />
        <Stat label="Teachers" value={teachers.length} />
        <Stat label="Attendance" value={pres + '%'} sub={`${att.length} records`} />
        <Stat label="Behaviour points" value={pts} />
      </div>
      <div className="grid g2" style={{ marginTop: 14 }}>
        <Card title="📊 Behaviour by category"><Bars data={Object.entries(groupBy(app.behaviour.filter(b => b.schoolId === sid), b => b.category)).map(([label, v]) => ({ label, value: (v as unknown[]).length }))} /></Card>
        <Card title="📈 Attendance mix"><Bars data={['present', 'late', 'absent', 'authorised', 'unauthorised'].map(s => ({ label: s, value: att.filter(a => a.status === s).length }))} /></Card>
      </div>
    </div>
  );
}
function groupBy<T>(arr: T[], fn: (x: T) => string) {
  const m: Record<string, T[]> = {};
  arr.forEach(x => { const k = fn(x); (m[k] ??= []).push(x); });
  return m;
}

function OwnerDash() {
  const app = useApp();
  const stats = app.schools.map(s => ({
    name: s.name,
    students: app.users.filter(u => u.schoolId === s.id && u.role === 'student').length,
    teachers: app.users.filter(u => u.schoolId === s.id && u.role === 'teacher').length,
    classes: app.classes.filter(c => c.schoolId === s.id).length,
    assignments: app.assignments.filter(a => a.schoolId === s.id).length,
    results: app.results.filter(r => r.schoolId === s.id).length,
  }));
  return (
    <div>
      <h2>🌐 Platform Owner Dashboard</h2>
      <div className="grid g4">
        <Stat label="Schools" value={app.schools.length} />
        <Stat label="Users" value={app.users.length} />
        <Stat label="Assignments" value={app.assignments.length} />
        <Stat label="Quiz results" value={app.results.length} />
      </div>
      <Card title="🏫 Per-school statistics" action={<button className="btn sm primary" onClick={() => app.setView('platform')}>Manage schools</button>}>
        <table className="tbl"><thead><tr><th>School</th><th>Students</th><th>Teachers</th><th>Classes</th><th>Assignments</th><th>Quiz activity</th></tr></thead>
          <tbody>{stats.map(s => <tr key={s.name}><td>{s.name}</td><td>{s.students}</td><td>{s.teachers}</td><td>{s.classes}</td><td>{s.assignments}</td><td>{s.results}</td></tr>)}</tbody></table>
      </Card>
    </div>
  );
}

function ParentDash() {
  const app = useApp();
  const u = app.user!;
  const kids = (u.linkedStudentIds ?? []).map(id => app.users.find(x => x.id === id)).filter(Boolean);
  return (
    <div>
      <h2>👪 Parent portal</h2>
      {kids.length === 0 && <Card><Empty text="No linked children. Ask your school admin to link your account." /></Card>}
      <div className="grid g2">
        {kids.map(k => {
          const open = app.assignments.filter(a => a.schoolId === u.schoolId && a.visible && (app.classes.find(c => c.id === a.classId)?.studentIds ?? []).includes(k!.id));
          const att = app.attendance.filter(a => a.studentId === k!.id);
          const pct = att.length ? Math.round(att.filter(a => a.status === 'present').length / att.length * 100) : 100;
          const pts = app.behaviour.filter(b => b.studentId === k!.id).reduce((s, b) => s + b.points, 0);
          return (
            <Card key={k!.id} title={`🧒 ${k!.name}`}>
              <p><b>Today:</b> {app.timetable.filter(t => t.schoolId === u.schoolId && (app.classes.find(c => c.id === t.classId)?.studentIds ?? []).includes(k!.id)).slice(0, 3).map(t => t.subject).join(' · ')}</p>
              <p><b>Homework:</b> {open.length} assignments</p>
              <p><b>Attendance:</b> {pct}%</p>
              <p><b>Behaviour:</b> {pts >= 0 ? '+' : ''}{pts} pts</p>
              <div className="row"><button className="btn sm" onClick={() => app.setView('assignments')}>Homework</button><button className="btn sm" onClick={() => app.setView('announcements')}>Notices</button></div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- TIMETABLE ---------- */
export function TimetableView() {
  const app = useApp();
  const u = app.user!;
  const [mode, setMode] = useState<'day' | 'week'>('week');
  const [day, setDay] = useState(todayDay());
  const [showEdit, setShowEdit] = useState(false);
  const [editing, setEditing] = useState<Partial<TimetableEntry>>({});
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  let rows = app.timetable.filter(t => (u.role === 'owner' ? true : t.schoolId === u.schoolId));
  if (u.role === 'student') rows = rows.filter(t => (app.classes.find(c => c.id === t.classId)?.studentIds ?? []).includes(u.id));
  if (u.role === 'parent') rows = rows.filter(t => (app.classes.find(c => c.id === t.classId)?.studentIds ?? []).some(id => (u.linkedStudentIds ?? []).includes(id)));
  if (u.role === 'teacher') rows = rows.filter(t => t.teacherId === u.id);
  const shown = mode === 'day' ? rows.filter(r => r.day === day) : rows;
  const now = new Date(); const cur = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const save = () => {
    if (!isAdmin(u)) { app.toast('Only admins manage the timetable.', 'err'); return; }
    if (!editing.subject || !editing.day || !editing.start || !editing.end || !editing.classId) { app.toast('Fill subject, day, times and class.', 'err'); return; }
    const e: TimetableEntry = {
      id: (editing.id as string) ?? uid('t'), schoolId: u.schoolId!, day: editing.day, start: editing.start, end: editing.end,
      subject: editing.subject, teacherId: editing.teacherId ?? u.id, room: editing.room ?? 'TBC', classId: editing.classId,
      status: editing.status ?? 'normal', note: editing.note,
    };
    const rest = app.timetable.filter(t => t.id !== e.id);
    app.update({ timetable: [...rest, e] });
    setShowEdit(false); setEditing({});
    app.toast('Timetable saved.');
  };
  return (
    <div>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h2>📅 Timetable</h2>
        <div className="row">
          <div className="tabs"><button className={mode === 'day' ? 'active' : ''} onClick={() => setMode('day')}>Day</button><button className={mode === 'week' ? 'active' : ''} onClick={() => setMode('week')}>Week</button></div>
          {isAdmin(u) && <button className="btn primary sm" onClick={() => { setEditing({ day: 'Mon', status: 'normal' }); setShowEdit(true); }}>＋ Lesson</button>}
        </div>
      </div>
      {mode === 'day' && <div className="tabs">{days.map(d => <button key={d} className={day === d ? 'active' : ''} onClick={() => setDay(d)}>{d}{d === todayDay() ? ' •' : ''}</button>)}</div>}
      <div className="grid g2">
        {(mode === 'week' ? days : [day]).map(d => (
          <Card key={d} title={`${d}${d === todayDay() ? ' (today)' : ''}`}>
            {shown.filter(r => r.day === d).sort((a, b) => a.start.localeCompare(b.start)).map(t => {
              const isNow = d === todayDay() && cur >= t.start && cur <= t.end;
              return (
                <div key={t.id} style={{ padding: '7px 0', borderBottom: '1px solid var(--border)', background: isNow ? '#fef9c3' : undefined, borderRadius: 6 }}>
                  <b>{t.start}–{t.end}</b> · {t.subject} · {t.room} · {userName(app, t.teacherId)} {isNow && <span className="badge">NOW</span>}
                  {t.status !== 'normal' && <span className="badge"> {t.status}{t.note ? ': ' + t.note : ''}</span>}
                  {isAdmin(u) && <span className="row" style={{ marginTop: 4 }}>
                    <button className="btn sm" onClick={() => { setEditing(t); setShowEdit(true); }}>Edit</button>
                    <button className="btn sm" onClick={() => app.update({ timetable: app.timetable.filter(x => x.id !== t.id) })}>Delete</button>
                  </span>}
                </div>
              );
            })}
            {shown.filter(r => r.day === d).length === 0 && <Empty text="No lessons." />}
          </Card>
        ))}
      </div>
      {showEdit && (
        <Modal title="Lesson" onClose={() => setShowEdit(false)}>
          <Field label="Day"><select className="in" value={editing.day ?? 'Mon'} onChange={e => setEditing({ ...editing, day: e.target.value })}>{days.map(d => <option key={d}>{d}</option>)}</select></Field>
          <div className="grid g2">
            <Field label="Start"><input className="in" type="time" value={editing.start ?? '09:00'} onChange={e => setEditing({ ...editing, start: e.target.value })} /></Field>
            <Field label="End"><input className="in" type="time" value={editing.end ?? '10:00'} onChange={e => setEditing({ ...editing, end: e.target.value })} /></Field>
          </div>
          <Field label="Subject"><input className="in" value={editing.subject ?? ''} onChange={e => setEditing({ ...editing, subject: e.target.value })} /></Field>
          <div className="grid g2">
            <Field label="Class"><select className="in" value={editing.classId ?? ''} onChange={e => setEditing({ ...editing, classId: e.target.value })}><option value="">—</option>{app.classes.filter(c => c.schoolId === u.schoolId).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
            <Field label="Room"><input className="in" value={editing.room ?? ''} onChange={e => setEditing({ ...editing, room: e.target.value })} /></Field>
          </div>
          <div className="grid g2">
            <Field label="Teacher"><select className="in" value={editing.teacherId ?? ''} onChange={e => setEditing({ ...editing, teacherId: e.target.value })}>{app.users.filter(x => x.schoolId === u.schoolId && (x.role === 'teacher' || x.role === 'admin')).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></Field>
            <Field label="Status"><select className="in" value={editing.status ?? 'normal'} onChange={e => setEditing({ ...editing, status: e.target.value as TimetableEntry['status'] })}><option value="normal">normal</option><option value="cancelled">cancelled</option><option value="cover">cover</option><option value="room-change">room-change</option></select></Field>
          </div>
          <Field label="Note (cover / room change)"><input className="in" value={editing.note ?? ''} onChange={e => setEditing({ ...editing, note: e.target.value })} /></Field>
          <div className="row"><button className="btn primary" onClick={save}>Save</button><button className="btn" onClick={() => setShowEdit(false)}>Cancel</button></div>
        </Modal>
      )}
    </div>
  );
}

/* ---------- ASSIGNMENTS + FEEDBACK ---------- */
export function AssignmentsView() {
  const app = useApp();
  const u = app.user!;
  const [openId, setOpenId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState<Partial<Assignment>>({ points: 10 });
  const studentIds = u.role === 'student' ? [u.id] : u.role === 'parent' ? (u.linkedStudentIds ?? []) : [];
  let list = app.assignments.filter(a => (u.role === 'owner' ? true : a.schoolId === u.schoolId));
  if (u.role === 'student' || u.role === 'parent') list = list.filter(a => a.visible && studentIds.some(sid => (app.classes.find(c => c.id === a.classId)?.studentIds ?? []).includes(sid)));
  if (u.role === 'teacher') { /* teachers see all in school; marking scoped to own classes */ }
  const create = () => {
    if (!canCreateAssignment(u)) { app.toast('No permission to create assignments.', 'err'); return; }
    if (!form.title || !form.classId || !form.dueDate) { app.toast('Title, class and due date required.', 'err'); return; }
    const a: Assignment = {
      id: uid('a'), schoolId: u.schoolId!, title: form.title, description: form.description ?? '',
      instructions: form.instructions ?? '', subject: form.subject ?? 'General', classId: form.classId,
      dueDate: form.dueDate, points: form.points ?? 10, rubric: form.rubric ?? '',
      visible: form.visible ?? true, allowResubmit: form.allowResubmit ?? true, attachmentNames: [],
    };
    app.update({ assignments: [a, ...app.assignments] });
    // notify students in class
    app.classes.find(c => c.id === a.classId)?.studentIds.forEach(sid => app.notify(sid, `New homework posted: ${a.title}`, 'assignments', a.schoolId));
    setShowNew(false); setForm({ points: 10 });
    app.toast('Assignment created.');
  };
  return (
    <div>
      <div className="row" style={{ justifyContent: 'space-between' }}><h2>📝 Assignments</h2>
        {canCreateAssignment(u) && <button className="btn primary sm" onClick={() => setShowNew(true)}>＋ Assignment</button>}
      </div>
      <div className="grid g2">
        {list.map(a => {
          const subs = app.submissions.filter(s => s.assignmentId === a.id);
          const mine = subs.find(s => s.studentId === (studentIds[0] ?? ''));
          return (
            <Card key={a.id} title={a.title} action={<button className="btn sm" onClick={() => setOpenId(a.id)}>Open</button>}>
              <div className="small muted">{a.subject} · {app.classes.find(c => c.id === a.classId)?.name} · due {a.dueDate} · {a.points} pts</div>
              <p>{a.description}</p>
              <div className="row">
                <StatusBadge assignmentId={a.id} studentId={studentIds[0]} />
                {(u.role === 'teacher' || u.role === 'admin') && <span className="badge">{subs.filter(s => s.status === 'submitted').length} to mark</span>}
                {mine?.grade !== undefined && <span className="badge">Grade: {mine.grade}/{a.points}</span>}
              </div>
            </Card>
          );
        })}
      </div>
      {list.length === 0 && <Empty text="No assignments visible." />}
      {showNew && (
        <Modal title="New assignment" onClose={() => setShowNew(false)}>
          <Field label="Title"><input className="in" value={form.title ?? ''} onChange={e => setForm({ ...form, title: e.target.value })} /></Field>
          <div className="grid g2">
            <Field label="Class"><select className="in" value={form.classId ?? ''} onChange={e => setForm({ ...form, classId: e.target.value })}><option value="">—</option>{app.classes.filter(c => c.schoolId === u.schoolId).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
            <Field label="Subject"><input className="in" value={form.subject ?? ''} onChange={e => setForm({ ...form, subject: e.target.value })} /></Field>
          </div>
          <Field label="Description"><input className="in" value={form.description ?? ''} onChange={e => setForm({ ...form, description: e.target.value })} /></Field>
          <Field label="Instructions"><textarea className="in" value={form.instructions ?? ''} onChange={e => setForm({ ...form, instructions: e.target.value })} /></Field>
          <div className="grid g2">
            <Field label="Due date"><input className="in" type="date" value={form.dueDate ?? ''} onChange={e => setForm({ ...form, dueDate: e.target.value })} /></Field>
            <Field label="Points"><input className="in" type="number" value={form.points ?? 10} onChange={e => setForm({ ...form, points: Number(e.target.value) })} /></Field>
          </div>
          <Field label="Rubric"><textarea className="in" value={form.rubric ?? ''} onChange={e => setForm({ ...form, rubric: e.target.value })} /></Field>
          <div className="row"><button className="btn primary" onClick={create}>Create</button><button className="btn" onClick={() => setShowNew(false)}>Cancel</button></div>
        </Modal>
      )}
      {openId && <AssignmentDetail id={openId} close={() => setOpenId(null)} />}
    </div>
  );
}

function StatusBadge({ assignmentId, studentId }: { assignmentId: string; studentId?: string }) {
  const app = useApp();
  if (!studentId) return <span className="badge">class work</span>;
  const s = app.submissions.find(x => x.assignmentId === assignmentId && x.studentId === studentId);
  return <span className="badge">{s?.status ?? 'not-started'}</span>;
}

function AssignmentDetail({ id, close }: { id: string; close(): void }) {
  const app = useApp();
  const u = app.user!;
  const a = app.assignments.find(x => x.id === id)!;
  const [text, setText] = useState('');
  const [reply, setReply] = useState<Record<string, string>>({});
  const [mark, setMark] = useState<Record<string, { grade: string; feedback: string }>>({});
  const subs = app.submissions.filter(s => s.assignmentId === id);
  const targetStudent = u.role === 'student' ? u.id : u.role === 'parent' ? (u.linkedStudentIds?.[0] ?? '') : '';
  const mine = subs.find(s => s.studentId === targetStudent);
  const submit = () => {
    if (!text.trim()) { app.toast('Write something or attach a file first.', 'err'); return; }
    const late = new Date(a.dueDate) < new Date() ? 'late' as const : 'submitted' as const;
    if (mine && !a.allowResubmit && mine.status !== 'not-started' && mine.status !== 'in-progress') { app.toast('Resubmission not allowed for this task.', 'err'); return; }
    const s: Submission = mine
      ? { ...mine, text, status: late, updatedAt: 'now' }
      : { id: uid('s'), schoolId: a.schoolId, assignmentId: id, studentId: targetStudent, text, fileNames: [], status: late, feedbackReplies: [], updatedAt: 'now' };
    const rest = app.submissions.filter(x => x.id !== s.id);
    app.update({ submissions: [s, ...rest] });
    // also mirror into Files as submission + notify teacher
    app.update({ files: [{ id: uid('f'), schoolId: a.schoolId, folder: 'Submissions', name: `${a.title} — ${userName(app, targetStudent)}.txt`, kind: 'submission', ownerId: targetStudent, size: `${text.length} chars`, content: text, classId: a.classId, date: 'now' }, ...app.files] });
    const t = app.classes.find(c => c.id === a.classId)?.teacherIds[0];
    if (t) app.notify(t, `New submission: ${a.title}`, 'assignments', a.schoolId);
    app.toast(late === 'late' ? 'Submitted late.' : 'Submitted 🎉');
  };
  const saveMark = (sid: string) => {
    if (!canMarkAssignment(u)) { app.toast('No marking permission.', 'err'); return; }
    const m = mark[sid]; if (!m?.grade) { app.toast('Enter a grade.', 'err'); return; }
    const s = subs.find(x => x.studentId === sid);
    if (!s) return;
    const upd: Submission = { ...s, grade: Number(m.grade), feedback: m.feedback, status: 'returned', updatedAt: 'now' };
    app.update({ submissions: app.submissions.map(x => x.id === s.id ? upd : x) });
    app.notify(sid, `Assignment returned: ${a.title}`, 'assignments', a.schoolId);
    app.toast('Feedback returned to student.');
  };
  return (
    <Modal title={a.title} onClose={close}>
      <p className="small muted">{a.subject} · due {a.dueDate} · {a.points} pts · {a.allowResubmit ? 'resubmit allowed' : 'no resubmit'}</p>
      <p><b>Instructions:</b> {a.instructions}</p>
      {a.rubric && <p><b>Rubric:</b> {a.rubric}</p>}
      {(u.role === 'student' || (u.role === 'parent' && targetStudent)) && (
        <div>
          <h4>Your submission {mine ? `(${mine.status}${mine.grade !== undefined ? ` · ${mine.grade}/${a.points}` : ''})` : ''}</h4>
          {mine?.feedback && <div className="card" style={{ background: '#f0fdf4' }}><b>Feedback ({mine.grade}/{a.points}):</b><p>{mine.feedback}</p>
            {mine.feedbackReplies.map((r, i) => <div key={i} className="small">↩ {userName(app, r.from)}: {r.text}</div>)}
            <div className="row"><input className="in" placeholder="Reply to feedback…" value={reply[mine.id] ?? ''} onChange={e => setReply({ ...reply, [mine.id]: e.target.value })} />
              <button className="btn sm" onClick={() => { const v = (reply[mine.id] ?? '').trim(); if (!v) return; app.update({ submissions: app.submissions.map(x => x.id === mine.id ? { ...x, feedbackReplies: [...x.feedbackReplies, { from: u.id, text: v, time: 'now' }] } : x) }); setReply({ ...reply, [mine.id]: '' }); }}>Reply</button></div>
          </div>}
          {u.role === 'student' && <><textarea className="in" placeholder="Type your work here (demo)…" value={text} onChange={e => setText(e.target.value)} />
            <div className="row" style={{ marginTop: 6 }}>
              <button className="btn sm" onClick={() => { setText(t => t + '\n[attached photo of work — demo]'); app.toast('Photo attached (demo metadata only).'); }}>📎 Attach</button>
              <button className="btn primary sm" onClick={submit}>Submit</button>
            </div></>}
        </div>
      )}
      {(u.role === 'teacher' || u.role === 'admin' || u.role === 'owner') && (
        <div>
          <h4>Submissions ({subs.length})</h4>
          {subs.map(s => (
            <div key={s.id} className="card" style={{ marginBottom: 8 }}>
              <b>{userName(app, s.studentId)}</b> <span className="badge">{s.status}</span>
              <p className="small">{s.text}</p>
              <div className="grid g2">
                <Field label={`Grade / ${a.points}`}><input className="in" type="number" value={mark[s.studentId]?.grade ?? s.grade?.toString() ?? ''} onChange={e => setMark({ ...mark, [s.studentId]: { grade: e.target.value, feedback: mark[s.studentId]?.feedback ?? s.feedback ?? '' } })} /></Field>
                <Field label="Written feedback"><input className="in" value={mark[s.studentId]?.feedback ?? s.feedback ?? ''} onChange={e => setMark({ ...mark, [s.studentId]: { grade: mark[s.studentId]?.grade ?? s.grade?.toString() ?? '', feedback: e.target.value } })} /></Field>
              </div>
              <div className="row"><button className="btn primary sm" onClick={() => saveMark(s.studentId)}>Return with feedback</button></div>
            </div>
          ))}
          {subs.length === 0 && <Empty text="No submissions yet." />}
        </div>
      )}
    </Modal>
  );
}

/* ---------- CLASSES ---------- */
export function ClassesView() {
  const app = useApp();
  const u = app.user!;
  const [showNew, setShowNew] = useState(false);
  const [name, setName] = useState(''); const [subject, setSubject] = useState('');
  let list = app.classes.filter(c => (u.role === 'owner' ? true : c.schoolId === u.schoolId));
  if (u.role === 'teacher') list = list.filter(c => c.teacherIds.includes(u.id));
  if (u.role === 'student') list = list.filter(c => c.studentIds.includes(u.id));
  if (u.role === 'parent') list = list.filter(c => c.studentIds.some(s => (u.linkedStudentIds ?? []).includes(s)));
  return (
    <div>
      <div className="row" style={{ justifyContent: 'space-between' }}><h2>📚 Classes</h2>
        {isAdmin(u) && <button className="btn primary sm" onClick={() => setShowNew(true)}>＋ Class</button>}</div>
      <div className="grid g2">
        {list.map(c => (
          <Card key={c.id} title={`${c.name} · ${c.subject}`}>
            <div className="small muted">{c.yearGroup} · {c.studentIds.length} students</div>
            <p><b>Teachers:</b> {c.teacherIds.map(t => userName(app, t)).join(', ')}</p>
            <p><b>Students:</b> {c.studentIds.map(s => userName(app, s)).join(', ') || '—'}</p>
            <div className="row">
              <button className="btn sm" onClick={() => app.setView('assignments')}>Assignments</button>
              <button className="btn sm" onClick={() => app.setView('quizzes')}>Quizzes</button>
              <button className="btn sm" onClick={() => app.setView('files')}>Files</button>
              <button className="btn sm" onClick={() => app.setView('messages')}>Class chat</button>
            </div>
          </Card>
        ))}
      </div>
      {showNew && (
        <Modal title="New class" onClose={() => setShowNew(false)}>
          <Field label="Name (e.g. 10A Maths)"><input className="in" value={name} onChange={e => setName(e.target.value)} /></Field>
          <Field label="Subject"><input className="in" value={subject} onChange={e => setSubject(e.target.value)} /></Field>
          <div className="row"><button className="btn primary" onClick={() => {
            if (!name.trim()) { app.toast('Name required.', 'err'); return; }
            const c: ClassGroup = { id: uid('c'), schoolId: u.schoolId!, name, subject: subject || 'General', yearGroup: 'Year 10', teacherIds: [], studentIds: [] };
            app.update({ classes: [...app.classes, c] }); setShowNew(false); setName(''); setSubject(''); app.toast('Class created.');
          }}>Create</button><button className="btn" onClick={() => setShowNew(false)}>Cancel</button></div>
        </Modal>
      )}
    </div>
  );
}
