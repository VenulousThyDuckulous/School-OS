import { useEffect, useState } from 'react';
import { useApp } from './store';
import { Toasts } from './components/ui';
import { Dashboard, TimetableView, AssignmentsView, ClassesView } from './pages/views1';
import { QuizzesView, BehaviourView, AttendanceView, MessagesView } from './pages/views2';
import { FilesView, AnnouncementsView, NotificationsView, AdminView, PlatformView } from './pages/views3';

const ICONS: Record<string, string> = {
  dashboard: '🏠', timetable: '📅', assignments: '📝', classes: '📚',
  quizzes: '🎮', behaviour: '📊', attendance: '📈', messages: '💬',
  files: '📁', announcements: '📢', notifications: '🔔', admin: '⚙️', platform: '🌐',
};

export default function App() {
  const app = useApp();
  const { user } = app;
  // Apply school branding as CSS variables
  useEffect(() => {
    const s = app.mySchool();
    const r = document.documentElement.style;
    r.setProperty('--school-primary', s?.primaryColor ?? '#1d4ed8');
    r.setProperty('--school-secondary', s?.secondaryColor ?? '#0f172a');
    r.setProperty('--school-accent', s?.accentColor ?? '#f59e0b');
    document.title = s ? `${s.name} · Powered by SchoolOS` : 'SchoolOS';
  }, [app]);
  if (!user) return <><Login /><Toasts /></>;
  return <Shell />;
}

function Login() {
  const app = useApp();
  const [schoolId, setSchoolId] = useState(app.schools[0]?.id ?? '');
  const [email, setEmail] = useState('alex@example.local');
  const [password, setPassword] = useState('demo');
  const [err, setErr] = useState('');
  const sch = app.schools.find(s => s.id === schoolId) ?? app.schools[0];
  const go = () => {
    const e = app.login(email, password, schoolId);
    if (e) setErr(e);
  };
  const quick = app.users.filter(u => (u.role === 'owner' && email.includes('owner')) || u.schoolId === schoolId);
  return (
    <div className="login-wrap" style={{ ['--school-primary' as string]: sch?.primaryColor, ['--school-secondary' as string]: sch?.secondaryColor, ['--school-accent' as string]: sch?.accentColor }}>
      <div className="login-card">
        <div style={{ textAlign: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 48 }}>{sch?.logo ?? '🎓'}</div>
          <h2 style={{ margin: '6px 0' }}>{sch?.name ?? 'SchoolOS'}</h2>
          <div className="muted small">Powered by SchoolOS · fictional demo</div>
        </div>
        <label className="small muted">School</label>
        <select className="in" value={schoolId} onChange={e => setSchoolId(e.target.value)} aria-label="Select school">
          {app.schools.map(s => <option key={s.id} value={s.id}>{s.name}{s.enabled ? '' : ' (disabled)'}</option>)}
        </select>
        <div style={{ height: 8 }} />
        <label className="small muted">Email</label>
        <input className="in" value={email} onChange={e => setEmail(e.target.value)} autoComplete="username" />
        <div style={{ height: 8 }} />
        <label className="small muted">Password</label>
        <input className="in" type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') go(); }} autoComplete="current-password" />
        {err && <p style={{ color: '#dc2626' }} role="alert">{err}</p>}
        <div className="row" style={{ marginTop: 10 }}>
          <button className="btn primary" style={{ flex: 1 }} onClick={go}>Log in</button>
          <button className="btn" onClick={() => app.toast('Password reset is disabled in the local demo — use password “demo”.', 'info')}>Forgot password?</button>
        </div>
        <p className="small muted">Quick login (password “demo”):</p>
        <div className="row">
          {app.users.filter(u => u.role === 'owner' || u.schoolId === schoolId).slice(0, 6).map(u => (
            <button key={u.id} className="btn sm" onClick={() => { setEmail(u.email); app.loginAs(u.id); }}>{u.role}: {u.name}</button>
          ))}
        </div>
        <p className="small muted">Demo only — no real auth. Owner: owner@schoolos.local (select any school).</p>
      </div>
    </div>
  );
}

function Shell() {
  const app = useApp();
  const { user, view, setView } = app;
  const [navOpen, setNavOpen] = useState(false);
  if (!user) return null;
  const sch = app.mySchool();
  const isOwnerView = user.role === 'owner';
  // Build nav: owner sees platform; others see school navOrder filtered by enabledFeatures + role modules
  let items: { key: string; label: string }[] = [];
  if (isOwnerView) {
    items = [
      { key: 'dashboard', label: 'Owner dashboard' },
      { key: 'platform', label: 'Schools & platform' },
      { key: 'announcements', label: 'Platform announcements' },
      { key: 'notifications', label: 'Notifications' },
    ];
  } else {
    const order = sch?.navOrder ?? ['dashboard'];
    const allowed = (m: string) => {
      if (m === 'dashboard' || m === 'notifications' || m === 'classes') return true;
      if (!(sch?.enabledFeatures ?? []).includes(m)) return false;
      if (user.role === 'student' && !((sch?.studentModules ?? []).includes(m) || m === 'dashboard')) return false;
      if (user.role === 'parent' && !((sch?.parentModules ?? []).includes(m) || m === 'dashboard')) return false;
      return true;
    };
    items = order.filter(allowed).map(k => ({ key: k, label: k[0].toUpperCase() + k.slice(1) }));
    if ((user.role === 'admin') && !items.find(i => i.key === 'admin')) items.push({ key: 'admin', label: 'Admin & settings' });
    if (user.role === 'teacher' && !items.find(i => i.key === 'admin')) { /* teachers get class mgmt inside classes */ }
  }
  const unread = app.notifications.filter(n => n.userId === user.id && !n.read).length;
  const myKids = user.role === 'parent' ? (user.linkedStudentIds ?? []) : [];
  return (
    <div className="shell">
      <aside className={`sidebar ${navOpen ? 'open' : ''}`} aria-label="Main navigation">
        <div className="brand">
          <span style={{ fontSize: 30 }}>{isOwnerView ? '🌐' : sch?.logo}</span>
          <b>{isOwnerView ? 'SchoolOS Owner' : sch?.name}</b>
          <small>{isOwnerView ? 'Platform control' : 'Powered by SchoolOS'} · {user.name} ({user.role})</small>
        </div>
        <nav className="nav">
          {items.map(i => (
            <button key={i.key} className={view === i.key ? 'active' : ''} onClick={() => { setView(i.key); setNavOpen(false); }}>
              {ICONS[i.key] ?? '•'} {i.label}{i.key === 'notifications' && unread > 0 ? ` (${unread})` : ''}
            </button>
          ))}
        </nav>
        <div style={{ padding: 10 }}>
          <button className="btn sm" style={{ width: '100%' }} onClick={app.logout}>Log out</button>
        </div>
      </aside>
      <div className="main">
        <div className="banner-demo">🧪 DEMO DATA — everything is fictional and stored locally in your browser. No real students.</div>
        <header className="topbar">
          <button className="btn sm hamb" onClick={() => setNavOpen(o => !o)} aria-label="Toggle menu">☰</button>
          <b>{isOwnerView ? '🌐 SchoolOS Platform' : `${sch?.logo} ${sch?.name}`}</b>
          <span style={{ flex: 1 }} />
          {user.role === 'parent' && myKids.length > 0 && <span className="badge">👪 {myKids.length} linked child{myKids.length > 1 ? 'ren' : ''}</span>}
          <button className="btn sm" onClick={() => { setView('notifications'); }}>🔔 {unread}</button>
          <button className="btn sm" onClick={app.resetDemo}>♻ Reset demo</button>
        </header>
        <main className="content" id="main">
          {view === 'dashboard' && <Dashboard />}
          {view === 'timetable' && <TimetableView />}
          {view === 'assignments' && <AssignmentsView />}
          {view === 'classes' && <ClassesView />}
          {view === 'quizzes' && <QuizzesView />}
          {view === 'behaviour' && <BehaviourView />}
          {view === 'attendance' && <AttendanceView />}
          {view === 'messages' && <MessagesView />}
          {view === 'files' && <FilesView />}
          {view === 'announcements' && <AnnouncementsView />}
          {view === 'notifications' && <NotificationsView />}
          {view === 'admin' && <AdminView />}
          {view === 'platform' && <PlatformView />}
        </main>
      </div>
      <Toasts />
    </div>
  );
}
