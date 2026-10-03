import { useMemo, useState } from 'react';
import { useApp, uid } from '../store';
import { Card, Field, Modal, Bars, Empty, Stat } from '../components/ui';
import { canHostQuiz, canAwardBehaviour, canTakeAttendance, canMessage } from '../permissions';
import { userName } from './views1';
import type { Quiz, Question, QuizSession } from '../types';

/* ================= QUIZZES ================= */
const MODES = [
  { id: 'classic', em: '🧠', n: 'Classic', d: 'Score-based quiz.' },
  { id: 'race', em: '🏎️', n: 'Race', d: 'Correct answers move your racer.' },
  { id: 'castle', em: '🏰', n: 'Castle', d: 'Correct answers build defenses.' },
  { id: 'tycoon', em: '💰', n: 'Tycoon', d: 'Correct answers earn coins.' },
  { id: 'space', em: '🚀', n: 'Space Race', d: 'Correct answers launch you.' },
] as const;

export function QuizzesView() {
  const app = useApp();
  const u = app.user!;
  const [tab, setTab] = useState<'browse' | 'live' | 'results'>('browse');
  const [takeId, setTakeId] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const list = app.quizzes.filter(q => (u.role === 'owner' ? true : q.schoolId === u.schoolId));
  return (
    <div>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h2>🎮 Quizzes</h2>
        {canHostQuiz(u) && <QuizBuilder />}
      </div>
      <div className="tabs">
        <button className={tab === 'browse' ? 'active' : ''} onClick={() => setTab('browse')}>Question sets</button>
        <button className={tab === 'live' ? 'active' : ''} onClick={() => setTab('live')}>Live game</button>
        <button className={tab === 'results' ? 'active' : ''} onClick={() => setTab('results')}>Results</button>
      </div>
      {tab === 'browse' && (
        <div className="grid g2">
          {list.map(q => (
            <Card key={q.id} title={`${q.title}`} action={<span className="badge">{q.questions.length} Qs</span>}>
              <div className="small muted">{q.subject} · {q.timerSec}s · {q.randomQ ? 'shuffled' : 'ordered'}</div>
              <div className="row" style={{ marginTop: 6 }}>
                <button className="btn primary sm" onClick={() => setTakeId(q.id)}>{u.role === 'student' || u.role === 'parent' ? '▶ Play' : '👁 Preview / Play'}</button>
                {canHostQuiz(u) && <HostButtons quiz={q} />}
              </div>
            </Card>
          ))}
          {list.length === 0 && <Empty text="No quizzes yet — teachers can build one." />}
        </div>
      )}
      {tab === 'live' && <LiveTab joinCode={joinCode} setJoinCode={setJoinCode} />}
      {tab === 'results' && <ResultsTab />}
      {takeId && <TakeQuiz id={takeId} close={() => setTakeId(null)} />}
    </div>
  );
}

function QuizBuilder() {
  const app = useApp();
  const u = app.user!;
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(''); const [subject, setSubject] = useState('Mathematics');
  const [classId, setClassId] = useState('');
  const [importText, setImportText] = useState('');
  const [qs, setQs] = useState<Question[]>([]);
  const [qtext, setQtext] = useState(''); const [opts, setOpts] = useState('A|B|C|D'); const [ans, setAns] = useState('0');
  const doImport = () => {
    // TERM<TAB>DEFINITION lines → mc questions with generated distractors
    const lines = importText.split('\n').map(l => l.trim()).filter(Boolean);
    if (!lines.length) { app.toast('Paste TERM<TAB>DEFINITION lines first.', 'err'); return; }
    const made: Question[] = lines.slice(0, 30).map((l, i) => {
      const [term, def] = l.split('\t');
      const others = lines.filter((_, j) => j !== i).map(x => x.split('\t')[1] ?? x.split('\t')[0]).slice(0, 3);
      while (others.length < 3) others.push(`Option ${others.length + 1}`);
      return { id: uid('qq'), kind: 'mc', text: `What does “${term ?? l}” mean?`, choices: [def ?? l, ...others], answer: 0, points: 10 };
    });
    setQs([...qs, ...made]);
    app.toast(`Imported ${made.length} questions.`);
  };
  const addQ = () => {
    if (!qtext.trim()) { app.toast('Question text required.', 'err'); return; }
    const choices = opts.split('|').map(s => s.trim()).filter(Boolean);
    setQs([...qs, { id: uid('qq'), kind: 'mc', text: qtext, choices: choices.length ? choices : ['True', 'False'], answer: Math.min(Number(ans) || 0, Math.max(0, choices.length - 1)), points: 10 }]);
    setQtext('');
  };
  const save = () => {
    if (!title.trim() || !classId) { app.toast('Title + class required.', 'err'); return; }
    if (!qs.length) { app.toast('Add at least one question.', 'err'); return; }
    const q: Quiz = { id: uid('q'), schoolId: u.schoolId!, title, subject, classId, questions: qs, timerSec: 60, randomQ: true, randomA: false };
    app.update({ quizzes: [q, ...app.quizzes] });
    setOpen(false); setTitle(''); setQs([]); setImportText('');
    app.toast('Quiz published to class.');
  };
  return (
    <>
      <button className="btn primary sm" onClick={() => { setClassId(app.classes.find(c => c.schoolId === u.schoolId)?.id ?? ''); setOpen(true); }}>＋ Question set</button>
      {open && (
        <Modal title="Build question set" onClose={() => setOpen(false)}>
          <div className="grid g2">
            <Field label="Title"><input className="in" value={title} onChange={e => setTitle(e.target.value)} /></Field>
            <Field label="Class"><select className="in" value={classId} onChange={e => setClassId(e.target.value)}><option value="">—</option>{app.classes.filter(c => c.schoolId === u.schoolId).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
          </div>
          <Field label="Import — TERM<TAB>DEFINITION per line (Quizlet-style)"><textarea className="in" rows={3} value={importText} onChange={e => setImportText(e.target.value)} placeholder={'Photosynthesis\tProcess plants use…\nMitochondria\tPowerhouse…'} /></Field>
          <div className="row"><button className="btn sm" onClick={doImport}>⇪ Import lines</button></div>
          <hr />
          <Field label="Manual question"><input className="in" value={qtext} onChange={e => setQtext(e.target.value)} placeholder="e.g. Solve 2x=10" /></Field>
          <div className="grid g2">
            <Field label="Choices (a|b|c|d)"><input className="in" value={opts} onChange={e => setOpts(e.target.value)} /></Field>
            <Field label="Correct index"><input className="in" type="number" value={ans} onChange={e => setAns(e.target.value)} /></Field>
          </div>
          <button className="btn sm" onClick={addQ}>＋ Add ({qs.length})</button>
          <div className="row" style={{ marginTop: 8 }}><button className="btn primary" onClick={save}>Publish</button><button className="btn" onClick={() => setOpen(false)}>Cancel</button></div>
        </Modal>
      )}
    </>
  );
}

function HostButtons({ quiz }: { quiz: Quiz }) {
  const app = useApp();
  const [mode, setMode] = useState<QuizSession['mode']>('classic');
  const host = () => {
    const code = Math.random().toString(36).slice(2, 8).toUpperCase();
    const s: QuizSession = { id: uid('qs'), schoolId: quiz.schoolId, quizId: quiz.id, code, mode, status: 'lobby', participants: [], leaderboard: [], questionIndex: 0 };
    app.setSessions([...app.sessions, s]);
    app.toast(`Live ${mode} hosted — code ${code}. Students: JOIN GAME.`);
  };
  return (
    <span className="row">
      <select className="in" style={{ width: 120 }} value={mode} onChange={e => setMode(e.target.value as QuizSession['mode'])} aria-label="Game mode">
        {MODES.map(m => <option key={m.id} value={m.id}>{m.em} {m.n}</option>)}
      </select>
      <button className="btn sm accent" onClick={host}>● Host live</button>
    </span>
  );
}

function LiveTab({ joinCode, setJoinCode }: { joinCode: string; setJoinCode(s: string): void }) {
  const app = useApp();
  const u = app.user!;
  const live = app.sessions.filter(s => (u.role === 'owner' ? true : s.schoolId === u.schoolId));
  const join = () => {
    const s = app.sessions.find(x => x.code.toUpperCase() === joinCode.trim().toUpperCase());
    if (!s) { app.toast('No game with that code.', 'err'); return; }
    if (u.role !== 'student') { app.toast('Only students join games (teachers host).', 'err'); return; }
    if (!s.participants.includes(u.id)) {
      app.setSessions(app.sessions.map(x => x.id === s.id ? { ...x, participants: [...x.participants, u.id], leaderboard: [...x.leaderboard, { studentId: u.id, score: 0, correct: 0 }] } : x));
    }
    app.toast(`Joined ${s.code}! Now play the set below.`);
  };
  const setStatus = (id: string, status: QuizSession['status']) => {
    if (!canHostQuiz(u)) { app.toast('Only teachers host.', 'err'); return; }
    app.setSessions(app.sessions.map(x => x.id === id ? { ...x, status } : x));
  };
  return (
    <div>
      <Card title="🔑 JOIN GAME">
        <div className="row"><input className="in" style={{ maxWidth: 200 }} placeholder="Game code (e.g. ABC123)" value={joinCode} onChange={e => setJoinCode(e.target.value)} aria-label="Game code" />
          <button className="btn primary" onClick={join}>Join</button></div>
        <p className="small muted">Students join from their own device with the teacher's code. Original SchoolOS modes — not copies of other games.</p>
      </Card>
      <div className="grid g2" style={{ marginTop: 12 }}>
        {live.map(s => {
          const q = app.quizzes.find(x => x.id === s.quizId);
          return (
            <Card key={s.id} title={`${s.code} · ${q?.title} · ${s.mode}`} action={<span className="badge">{s.status}</span>}>
              <p className="small">👥 {s.participants.length} joined</p>
              {s.leaderboard.slice().sort((a, b) => b.score - a.score).slice(0, 5).map((l, i) => (
                <div key={l.studentId} className="race-track"><div className="race-car" style={{ left: `${Math.min(92, l.score / 3)}%` }}>{['🏎️', '🏰', '💰', '🚀', '🧠'][MODES.findIndex(m => m.id === s.mode)] ?? '🏁'}</div><span className="small"> #{i + 1} {userName(app, l.studentId)} — {l.score}</span></div>
              ))}
              {canHostQuiz(u) && <div className="row">
                <button className="btn sm" onClick={() => setStatus(s.id, 'live')}>▶ Start</button>
                <button className="btn sm" onClick={() => setStatus(s.id, 'ended')}>■ End</button>
                <button className="btn sm" onClick={() => app.setSessions(app.sessions.filter(x => x.id !== s.id))}>Delete</button>
              </div>}
              {u.role === 'student' && s.participants.includes(u.id) && s.status === 'live' && q && <PlayEmbedded quizId={q.id} sessionId={s.id} />}
            </Card>
          );
        })}
      </div>
      {live.length === 0 && <Empty text="No live games. Teachers: host from a question set." />}
    </div>
  );
}

export function TakeQuiz({ id, close, sessionId }: { id: string; close(): void; sessionId?: string }) {
  return <Modal title="Quiz" onClose={close}><PlayEmbedded quizId={id} sessionId={sessionId} /></Modal>;
}

function PlayEmbedded({ quizId, sessionId }: { quizId: string; sessionId?: string }) {
  const app = useApp();
  const u = app.user!;
  const quiz = app.quizzes.find(q => q.id === quizId)!;
  const order = useMemo(() => {
    const arr = [...quiz.questions];
    if (quiz.randomQ) arr.sort(() => Math.random() - 0.5);
    return arr;
  }, [quiz]);
  const [i, setI] = useState(0);
  const [score, setScore] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [missed, setMissed] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const [picked, setPicked] = useState<string>('');
  const q = order[i];
  if (!q) return <Empty text="Quiz has no valid questions." />;
  const answer = (val: string | number) => {
    const ok = String(val).trim().toLowerCase() === String(q.answer).trim().toLowerCase();
    const gained = ok ? q.points : 0;
    if (ok) { setScore(s => s + gained); setCorrect(c => c + 1); } else setMissed(m => [...m, q.text]);
    if (sessionId) {
      app.setSessions(app.sessions.map(s => s.id === sessionId ? {
        ...s,
        leaderboard: s.leaderboard.map(l => l.studentId === u.id ? { ...l, score: l.score + gained, correct: l.correct + (ok ? 1 : 0) } : l),
      } : s));
    }
    if (i + 1 >= order.length) {
      const total = order.length; const acc = Math.round(((correct + (ok ? 1 : 0)) / total) * 100);
      app.update({ results: [{ id: uid('qr'), schoolId: quiz.schoolId, quizId, sessionId, studentId: u.id, score: score + gained, correct: correct + (ok ? 1 : 0), total, accuracy: acc, timeSec: 60, date: 'today', missed: ok ? missed : [...missed, q.text] }, ...app.results] });
      setDone(true);
    } else { setI(i + 1); setPicked(''); }
  };
  if (done) {
    const board = sessionId ? (app.sessions.find(s => s.id === sessionId)?.leaderboard ?? []).slice().sort((a, b) => b.score - a.score) : [];
    return (
      <div>
        <h3>🎉 Score {score} · {correct}/{order.length} · {Math.round(correct / order.length * 100)}%</h3>
        {missed.length > 0 && <><b>Review:</b><ul>{missed.map((m, k) => <li key={k}>{m}</li>)}</ul></>}
        {board.length > 0 && <><b>Leaderboard:</b><ol>{board.map(l => <li key={l.studentId}>{userName(app, l.studentId)} — {l.score}</li>)}</ol></>}
      </div>
    );
  }
  return (
    <div>
      <p className="small muted">Q{i + 1}/{order.length} · {q.points} pts</p>
      <h3>{q.text}</h3>
      {(q.kind === 'mc' || q.kind === 'tf') && q.choices.map((c, k) => (
        <button key={k} className="btn" style={{ display: 'block', width: '100%', textAlign: 'left', marginBottom: 6 }} onClick={() => answer(k)}>{c}</button>
      ))}
      {q.kind === 'short' && (
        <div className="row"><input className="in" value={picked} onChange={e => setPicked(e.target.value)} placeholder="Type answer…" aria-label="Short answer" /><button className="btn primary sm" onClick={() => answer(picked)}>Check</button></div>
      )}
      <div className="bar" style={{ marginTop: 8 }}><div style={{ width: `${(i / order.length) * 100}%` }} /></div>
    </div>
  );
}

function ResultsTab() {
  const app = useApp();
  const u = app.user!;
  let res = app.results.filter(r => (u.role === 'owner' ? true : r.schoolId === u.schoolId));
  if (u.role === 'student') res = res.filter(r => r.studentId === u.id);
  if (u.role === 'parent') res = res.filter(r => (u.linkedStudentIds ?? []).includes(r.studentId));
  return (
    <Card title="📊 Quiz results">
      {res.length === 0 && <Empty text="No results yet — play a quiz." />}
      <table className="tbl"><thead><tr><th>Quiz</th><th>Student</th><th>Score</th><th>Acc</th><th>Date</th></tr></thead>
        <tbody>{res.map(r => <tr key={r.id}><td>{app.quizzes.find(q => q.id === r.quizId)?.title}</td><td>{userName(app, r.studentId)}</td><td>{r.score} ({r.correct}/{r.total})</td><td>{r.accuracy}%</td><td>{r.date}</td></tr>)}</tbody></table>
    </Card>
  );
}

/* ================= BEHAVIOUR ================= */
export function BehaviourView() {
  const app = useApp();
  const u = app.user!;
  const [studentId, setStudentId] = useState('');
  const [kind, setKind] = useState<'positive' | 'negative'>('positive');
  const [category, setCategory] = useState('');
  const [note, setNote] = useState('');
  const sch = app.mySchool();
  const students = app.users.filter(x => x.schoolId === u.schoolId && x.role === 'student' && !x.disabled);
  const visible = u.role === 'student' ? app.behaviour.filter(b => b.studentId === u.id) : u.role === 'parent' ? app.behaviour.filter(b => (u.linkedStudentIds ?? []).includes(b.studentId)) : app.behaviour.filter(b => b.schoolId === u.schoolId);
  const totals = students.map(s => ({ label: s.name, value: app.behaviour.filter(b => b.studentId === s.id).reduce((t, b) => t + b.points, 0) }));
  const award = () => {
    if (!canAwardBehaviour(u)) { app.toast('Only staff award points.', 'err'); return; }
    if (!studentId || !category) { app.toast('Pick student + category.', 'err'); return; }
    const pts = kind === 'positive' ? 2 : -2;
    app.update({ behaviour: [{ id: uid('b'), schoolId: u.schoolId!, studentId, teacherId: u.id, kind, category, points: pts, note, date: 'today' }, ...app.behaviour] });
    app.notify(studentId, `Behaviour point: ${category} (${pts > 0 ? '+' : ''}${pts})`, 'behaviour', u.schoolId);
    setNote(''); app.toast('Recorded.');
  };
  return (
    <div>
      <h2>📊 Behaviour</h2>
      <div className="grid g2">
        <Card title="🏆 Points leaderboard"><Bars data={totals} /></Card>
        <Card title="🎁 Rewards">
          {app.rewards.filter(r => r.schoolId === u.schoolId).map(r => <div key={r.id}>• <b>{r.name}</b> — {r.cost} pts <span className="muted small">{r.desc}</span></div>)}
          {(u.role === 'admin' || u.role === 'owner') && <RewardEditor />}
        </Card>
      </div>
      {canAwardBehaviour(u) && (
        <Card title="⭐ Award / record">
          <div className="grid g2">
            <Field label="Student"><select className="in" value={studentId} onChange={e => setStudentId(e.target.value)}><option value="">—</option>{students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
            <Field label="Type"><select className="in" value={kind} onChange={e => { setKind(e.target.value as 'positive' | 'negative'); setCategory(''); }}><option value="positive">⭐ Positive</option><option value="negative">⚠ Incident</option></select></Field>
          </div>
          <Field label="Category"><select className="in" value={category} onChange={e => setCategory(e.target.value)}><option value="">—</option>{(kind === 'positive' ? sch?.behaviourCategories.positive : sch?.behaviourCategories.negative)?.map(c => <option key={c}>{c}</option>)}</select></Field>
          <Field label="Note"><input className="in" value={note} onChange={e => setNote(e.target.value)} /></Field>
          <button className="btn primary" onClick={award}>Save</button>
        </Card>
      )}
      <Card title="📜 Records">
        <table className="tbl"><thead><tr><th>Date</th><th>Student</th><th>Category</th><th>Pts</th><th>By</th><th>Note</th></tr></thead>
          <tbody>{visible.slice(0, 40).map(b => <tr key={b.id}><td>{b.date}</td><td>{userName(app, b.studentId)}</td><td>{b.kind === 'positive' ? '⭐' : '⚠'} {b.category}</td><td>{b.points}</td><td>{userName(app, b.teacherId)}</td><td>{b.note}</td></tr>)}</tbody></table>
      </Card>
      <Detentions />
    </div>
  );
}
function RewardEditor() {
  const app = useApp();
  const u = app.user!;
  const [name, setName] = useState(''); const [cost, setCost] = useState('500');
  return (
    <div className="row" style={{ marginTop: 8 }}>
      <input className="in" style={{ maxWidth: 180 }} placeholder="Reward name" value={name} onChange={e => setName(e.target.value)} aria-label="Reward name" />
      <input className="in" style={{ maxWidth: 100 }} type="number" value={cost} onChange={e => setCost(e.target.value)} aria-label="Cost" />
      <button className="btn sm" onClick={() => {
        if (!name.trim()) { app.toast('Name required.', 'err'); return; }
        app.update({ rewards: [...app.rewards, { id: uid('r'), schoolId: u.schoolId!, name, cost: Number(cost) || 100, desc: 'School reward (demo).' }] });
        setName(''); app.toast('Reward added.');
      }}>＋ Add</button>
    </div>
  );
}
function Detentions() {
  const app = useApp();
  const u = app.user!;
  const [f, setF] = useState({ studentId: '', date: '', time: '15:30', location: 'Room 5', reason: '' });
  const list = app.detentions.filter(d => d.schoolId === u.schoolId && (u.role === 'student' ? d.studentId === u.id : u.role === 'parent' ? (u.linkedStudentIds ?? []).includes(d.studentId) : true));
  return (
    <Card title="🚨 Detentions" action={(u.role === 'admin' || u.role === 'teacher' || u.role === 'owner') ? <span className="small muted">staff can assign</span> : undefined}>
      {(u.role === 'admin' || u.role === 'teacher' || u.role === 'owner') && (
        <div className="grid g2">
          <Field label="Student"><select className="in" value={f.studentId} onChange={e => setF({ ...f, studentId: e.target.value })}><option value="">—</option>{app.users.filter(x => x.schoolId === u.schoolId && x.role === 'student').map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
          <Field label="Reason"><input className="in" value={f.reason} onChange={e => setF({ ...f, reason: e.target.value })} /></Field>
          <Field label="Date"><input className="in" type="date" value={f.date} onChange={e => setF({ ...f, date: e.target.value })} /></Field>
          <Field label="Time"><input className="in" type="time" value={f.time} onChange={e => setF({ ...f, time: e.target.value })} /></Field>
          <div><button className="btn sm" onClick={() => {
            if (!f.studentId || !f.date || !f.reason) { app.toast('Student, date, reason required.', 'err'); return; }
            app.update({ detentions: [{ id: uid('d'), schoolId: u.schoolId!, studentId: f.studentId, staffId: u.id, date: f.date, time: f.time, location: f.location, reason: f.reason, done: false }, ...app.detentions] });
            app.notify(f.studentId, `Detention assigned: ${f.date} ${f.time}`, 'behaviour', u.schoolId);
            app.toast('Detention assigned.');
          }}>Assign</button></div>
        </div>
      )}
      {list.map(d => <div key={d.id}>• <b>{userName(app, d.studentId)}</b> — {d.date} {d.time} · {d.location} · {d.reason} {d.done ? '(done)' : ''}</div>)}
      {list.length === 0 && <Empty text="No detentions." />}
    </Card>
  );
}

/* ================= ATTENDANCE ================= */
export function AttendanceView() {
  const app = useApp();
  const u = app.user!;
  const [date, setDate] = useState('2026-10-03');
  const [marks, setMarks] = useState<Record<string, string>>({});
  const students = app.users.filter(x => x.schoolId === u.schoolId && x.role === 'student' && !x.disabled);
  const mine = u.role === 'student' ? [u.id] : u.role === 'parent' ? (u.linkedStudentIds ?? []) : students.map(s => s.id);
  const recs = app.attendance.filter(a => a.schoolId === u.schoolId && mine.includes(a.studentId));
  const pct = recs.length ? Math.round(recs.filter(r => r.status === 'present').length / recs.length * 100) : 100;
  const save = () => {
    if (!canTakeAttendance(u)) { app.toast('Only staff record attendance.', 'err'); return; }
    const adds = Object.entries(marks).map(([sid, status]) => ({ id: uid('at'), schoolId: u.schoolId!, studentId: sid, date, status: status as 'present' | 'late' | 'absent' | 'authorised' | 'unauthorised' }));
    if (!adds.length) { app.toast('Mark at least one student.', 'err'); return; }
    app.update({ attendance: [...adds, ...app.attendance.filter(a => !(a.date === date && adds.find(x => x.studentId === a.studentId)))] });
    setMarks({}); app.toast(`Attendance saved for ${adds.length}.`);
  };
  return (
    <div>
      <h2>📈 Attendance</h2>
      <div className="grid g4"><Stat label="Overall" value={pct + '%'} sub={`${recs.length} records`} />
        {['present', 'late', 'absent'].map(s => <Stat key={s} label={s} value={recs.filter(r => r.status === s).length} />)}</div>
      {canTakeAttendance(u) && (
        <Card title="✏️ Take register">
          <div className="row"><input className="in" style={{ maxWidth: 180 }} type="date" value={date} onChange={e => setDate(e.target.value)} aria-label="Register date" />
            <button className="btn primary sm" onClick={save}>Save register</button></div>
          <table className="tbl"><thead><tr><th>Student</th><th>Status</th></tr></thead><tbody>
            {students.map(s => <tr key={s.id}><td>{s.name}</td><td><select className="in" value={marks[s.id] ?? app.attendance.find(a => a.studentId === s.id && a.date === date)?.status ?? 'present'} onChange={e => setMarks({ ...marks, [s.id]: e.target.value })}>{['present', 'late', 'absent', 'authorised', 'unauthorised'].map(o => <option key={o}>{o}</option>)}</select></td></tr>)}
          </tbody></table>
        </Card>
      )}
      <Card title="📜 Records">
        <table className="tbl"><thead><tr><th>Date</th><th>Student</th><th>Status</th></tr></thead>
          <tbody>{recs.slice(0, 60).map(r => <tr key={r.id}><td>{r.date}</td><td>{userName(app, r.studentId)}</td><td><span className="badge">{r.status}</span></td></tr>)}</tbody></table>
      </Card>
    </div>
  );
}

/* ================= MESSAGES ================= */
export function MessagesView() {
  const app = useApp();
  const u = app.user!;
  const [sel, setSel] = useState<string>(app.conversations.find(c => c.schoolId === u.schoolId && c.memberIds.includes(u.id))?.id ?? '');
  const [draft, setDraft] = useState('');
  const [showNew, setShowNew] = useState(false);
  const mine = app.conversations.filter(c => c.schoolId === u.schoolId && c.memberIds.includes(u.id));
  const conv = mine.find(c => c.id === sel);
  const msgs = app.messages.filter(m => m.conversationId === sel).sort((a, b) => a.id.localeCompare(b.id));
  // mark read
  const open = (id: string) => {
    setSel(id);
    app.update({ messages: app.messages.map(m => m.conversationId === id && !m.readBy.includes(u.id) ? { ...m, readBy: [...m.readBy, u.id] } : m) });
  };
  const send = () => {
    if (!conv || !draft.trim()) return;
    app.update({ messages: [...app.messages, { id: uid('m'), schoolId: conv.schoolId, conversationId: conv.id, senderId: u.id, text: draft.trim(), time: 'now', readBy: [u.id] }] });
    conv.memberIds.filter(id => id !== u.id).forEach(id => app.notify(id, `New message from ${u.name}`, 'messages', conv.schoolId));
    setDraft('');
  };
  return (
    <div>
      <div className="row" style={{ justifyContent: 'space-between' }}><h2>💬 Messages</h2><button className="btn primary sm" onClick={() => setShowNew(true)}>＋ New</button></div>
      <p className="small muted">School-safe: students message teachers and class channels — no private student↔student chats. Staff can moderate &amp; reports go to admins.</p>
      <div className="grid g2">
        <Card title="Conversations">
          {mine.map(c => {
            const unread = app.messages.filter(m => m.conversationId === c.id && !m.readBy.includes(u.id)).length;
            return <button key={c.id} className="btn sm" style={{ display: 'block', width: '100%', textAlign: 'left', marginBottom: 6, borderColor: sel === c.id ? 'var(--school-primary)' : undefined }} onClick={() => open(c.id)}><b>{c.title}</b> <span className="small muted">({c.kind})</span>{unread > 0 && <span className="badge"> {unread} new</span>}</button>;
          })}
          {mine.length === 0 && <Empty text="No conversations yet." />}
        </Card>
        <Card title={conv?.title ?? 'Select a conversation'}>
          {!conv ? <Empty text="Pick a conversation." /> : (
            <div>
              <div style={{ maxHeight: 320, overflow: 'auto', border: '1px solid var(--border)', borderRadius: 10, padding: 8, marginBottom: 8 }}>
                {msgs.map(m => (
                  <div key={m.id} style={{ textAlign: m.senderId === u.id ? 'right' : 'left', margin: '6px 0' }}>
                    <span style={{ display: 'inline-block', background: m.senderId === u.id ? 'var(--school-primary)' : '#f1f5f9', color: m.senderId === u.id ? '#fff' : '#111', borderRadius: 10, padding: '6px 10px', maxWidth: '85%' }}>
                      <span className="small"><b>{userName(app, m.senderId)}</b> · {m.time}</span><br />{m.text}
                      {m.reported && <><br /><span className="badge">reported</span></>}
                    </span>
                    {m.senderId !== u.id && <div><button className="btn sm" onClick={() => { app.update({ messages: app.messages.map(x => x.id === m.id ? { ...x, reported: true } : x) }); app.toast('Reported to admin (demo).', 'info'); }}>⚑ Report</button></div>}
                  </div>
                ))}
              </div>
              <div className="row"><input className="in" value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') send(); }} placeholder="Write a school-appropriate message…" aria-label="Message" /><button className="btn primary sm" onClick={send}>Send</button></div>
            </div>
          )}
        </Card>
      </div>
      {showNew && <NewConvo close={() => setShowNew(false)} onCreated={setSel} />}
    </div>
  );
}
function NewConvo({ close, onCreated }: { close(): void; onCreated(id: string): void }) {
  const app = useApp();
  const u = app.user!;
  const [other, setOther] = useState('');
  const [title, setTitle] = useState('');
  const candidates = app.users.filter(x => x.schoolId === u.schoolId && x.id !== u.id && !x.disabled && !(u.role === 'student' && x.role === 'student'));
  return (
    <Modal title="New conversation" onClose={close}>
      <p className="small muted">Safety enforced: {u.role === 'student' ? 'you can message teachers or your class channel.' : 'student↔student DMs are blocked; use a class channel.'}</p>
      <Field label="With"><select className="in" value={other} onChange={e => setOther(e.target.value)}><option value="">—</option>{candidates.map(c => <option key={c.id} value={c.id}>{c.name} ({c.role})</option>)}</select></Field>
      <Field label="Title"><input className="in" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Question about algebra" /></Field>
      <button className="btn primary" onClick={() => {
        const to = app.users.find(x => x.id === other);
        if (!to) { app.toast('Pick a recipient.', 'err'); return; }
        if (!canMessage(u, to)) { app.toast('Student-to-student private messaging is blocked. Use a class channel.', 'err'); return; }
        const c = { id: uid('conv'), schoolId: u.schoolId!, kind: 'direct' as const, title: title || `${u.name} ↔ ${to.name}`, memberIds: [u.id, to.id] };
        app.update({ conversations: [...app.conversations, c] });
        onCreated(c.id); close(); app.toast('Conversation created.');
      }}>Create</button>
    </Modal>
  );
}
