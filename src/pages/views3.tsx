import { useState } from 'react';
import { useApp, uid } from '../store';
import { Card, Field, Modal, Empty } from '../components/ui';
import { canManageFiles, canCreateSchoolAnnouncement, canCreatePlatformAnnouncement, canManageUsers, canManageSchool, isOwner } from '../permissions';
import { userName } from './views1';
import type { FileAsset, Announcement, School, User } from '../types';

/* ================= FILES ================= */
export function FilesView() {
  const app = useApp();
  const u = app.user!;
  const [folder, setFolder] = useState('All');
  const [q, setQ] = useState('');
  const [showUp, setShowUp] = useState(false);
  const [name, setName] = useState(''); const [content, setContent] = useState(''); const [fclass, setFclass] = useState('');
  const folders = ['All', ...new Set(app.files.filter(f => f.schoolId === u.schoolId).map(f => f.folder))];
  const list = app.files.filter(f => f.schoolId === u.schoolId && (folder === 'All' || f.folder === folder) && (!q || f.name.toLowerCase().includes(q.toLowerCase())));
  const download = (f: FileAsset) => {
    try {
      const blob = new Blob([f.content], { type: 'text/plain' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = f.name; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    } catch { app.toast('Download failed (demo).', 'err'); }
  };
  return (
    <div>
      <div className="row" style={{ justifyContent: 'space-between' }}><h2>📁 Files</h2>
        {canManageFiles(u) && <button className="btn primary sm" onClick={() => setShowUp(true)}>⬆ Upload resource</button>}</div>
      <div className="row">
        <div className="tabs">{folders.map(f => <button key={f} className={folder === f ? 'active' : ''} onClick={() => setFolder(f)}>{f}</button>)}</div>
        <input className="in" style={{ maxWidth: 220 }} placeholder="Search files…" value={q} onChange={e => setQ(e.target.value)} aria-label="Search files" />
      </div>
      <table className="tbl"><thead><tr><th>Name</th><th>Folder</th><th>Size</th><th>Owner</th><th></th></tr></thead>
        <tbody>{list.map(f => <tr key={f.id}><td>📄 {f.name} <span className="small muted">({f.kind})</span></td><td>{f.folder}</td><td>{f.size}</td><td>{userName(app, f.ownerId)}</td>
          <td><span className="row"><button className="btn sm" onClick={() => download(f)}>Download</button>
            {canManageFiles(u) && <button className="btn sm" onClick={() => app.update({ files: app.files.filter(x => x.id !== f.id) })}>Delete</button>}</span></td></tr>)}</tbody></table>
      {list.length === 0 && <Empty text="No files here." />}
      {showUp && (
        <Modal title="Upload resource (demo — stored as text locally)" onClose={() => setShowUp(false)}>
          <Field label="File name"><input className="in" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. worksheet.pdf" /></Field>
          <Field label="Class folder"><select className="in" value={fclass} onChange={e => setFclass(e.target.value)}><option value="">General</option>{app.classes.filter(c => c.schoolId === u.schoolId).map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</select></Field>
          <Field label="Content (paste text — demo only, 200KB limit)"><textarea className="in" rows={4} value={content} onChange={e => setContent(e.target.value)} /></Field>
          <button className="btn primary" onClick={() => {
            if (!name.trim()) { app.toast('Name required.', 'err'); return; }
            if (content.length > 200000) { app.toast('File too large for demo (200KB).', 'err'); return; }
            app.update({ files: [{ id: uid('f'), schoolId: u.schoolId!, folder: fclass || 'General', name, kind: 'resource', ownerId: u.id, size: `${Math.max(1, Math.round(content.length / 1024))} KB`, content: content || '(empty demo file)', date: 'now' }, ...app.files] });
            setShowUp(false); setName(''); setContent(''); app.toast('Uploaded.');
          }}>Upload</button>
        </Modal>
      )}
    </div>
  );
}

/* ================= ANNOUNCEMENTS ================= */
export function AnnouncementsView() {
  const app = useApp();
  const u = app.user!;
  const [showNew, setShowNew] = useState(false);
  const [kind, setKind] = useState('General'); const [title, setTitle] = useState(''); const [body, setBody] = useState('');
  const [audience, setAudience] = useState('whole-school');
  const platform = app.announcements.filter(a => a.scope === 'platform');
  const school = app.announcements.filter(a => a.schoolId === u.schoolId && a.scope === 'school');
  const visiblePlatform = platform.filter(a => ['everyone', 'all-schools', u.role + 's', u.role].includes(a.audience) || a.audience === 'everyone');
  return (
    <div>
      <div className="row" style={{ justifyContent: 'space-between' }}><h2>📢 Announcements</h2>
        {(canCreateSchoolAnnouncement(u) || u.role === 'owner') && <button className="btn primary sm" onClick={() => setShowNew(true)}>＋ Announce</button>}</div>
      <h3>📢 <span className="badge platform">SCHOOLOS · platform</span> <span className="small muted">(owner only — schools can't edit)</span></h3>
      {visiblePlatform.map(a => <AnnCard key={a.id} a={a} platform />)}
      {visiblePlatform.length === 0 && <Empty text="No platform notices for you." />}
      <h3 style={{ marginTop: 18 }}>🏫 <span className="badge school">{app.mySchool()?.name ?? 'School'}</span></h3>
      {school.map(a => <AnnCard key={a.id} a={a} />)}
      {school.length === 0 && <Empty text="No school announcements." />}
      {showNew && (
        <Modal title={u.role === 'owner' ? 'New platform announcement' : 'New school announcement'} onClose={() => setShowNew(false)}>
          {u.role === 'owner' ? (
            <PlatformAnnForm close={() => setShowNew(false)} />
          ) : (
            <div>
              <div className="grid g2">
                <Field label="Type"><select className="in" value={kind} onChange={e => setKind(e.target.value)}><option>General</option><option>Important</option><option>Emergency</option><option>Event</option><option>Reminder</option></select></Field>
                <Field label="Target"><select className="in" value={audience} onChange={e => setAudience(e.target.value)}><option value="whole-school">Whole school</option><option value="teachers">Teachers</option><option value="students">Students</option><option value="parents">Parents</option></select></Field>
              </div>
              <Field label="Title"><input className="in" value={title} onChange={e => setTitle(e.target.value)} /></Field>
              <Field label="Body"><textarea className="in" value={body} onChange={e => setBody(e.target.value)} /></Field>
              <button className="btn primary" onClick={() => {
                if (!title.trim() || !body.trim()) { app.toast('Title + body required.', 'err'); return; }
                const a: Announcement = { id: uid('sa'), schoolId: u.schoolId, scope: 'school', kind, title, body, author: u.name, date: 'today', priority: kind === 'Emergency' ? 'urgent' : 'normal', audience };
                app.update({ announcements: [a, ...app.announcements] });
                setShowNew(false); setTitle(''); setBody(''); app.toast('School announcement posted.');
              }}>Post</button>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
export function AnnCard({ a, platform }: { a: Announcement; platform?: boolean }) {
  return (
    <div className="card" style={{ marginBottom: 10, borderLeft: `5px solid ${platform ? '#7c3aed' : a.priority === 'urgent' ? '#dc2626' : '#1d4ed8'}` }}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <b>{platform ? '📢 SCHOOLOS: ' : '🏫 '}{a.title}</b>
        <span><span className={`badge ${platform ? 'platform' : 'school'}`}>{a.kind}</span> {a.priority === 'urgent' && <span className="badge urgent">URGENT</span>}</span>
      </div>
      <p>{a.body}</p>
      <div className="small muted">{a.author} · {a.date} · audience: {a.audience}</div>
    </div>
  );
}
export function PlatformAnnForm({ close }: { close(): void }) {
  const app = useApp();
  const u = app.user!;
  const [kind, setKind] = useState('Update'); const [title, setTitle] = useState(''); const [body, setBody] = useState('');
  const [audience, setAudience] = useState('everyone');
  return (
    <div>
      <div className="grid g2">
        <Field label="Type"><select className="in" value={kind} onChange={e => setKind(e.target.value)}><option>Update</option><option>Maintenance</option><option>Bug fix</option><option>Important</option><option>Urgent</option><option>General</option></select></Field>
        <Field label="Audience"><select className="in" value={audience} onChange={e => setAudience(e.target.value)}><option value="everyone">Everyone</option><option value="all-schools">All schools</option><option value="teachers">Teachers</option><option value="students">Students</option><option value="parents">Parents</option><option value="admins">School administrators</option></select></Field>
      </div>
      <Field label="Title"><input className="in" value={title} onChange={e => setTitle(e.target.value)} /></Field>
      <Field label="Body"><textarea className="in" value={body} onChange={e => setBody(e.target.value)} /></Field>
      <button className="btn primary" onClick={() => {
        if (!canCreatePlatformAnnouncement(u)) { app.toast('Only the platform owner posts here.', 'err'); return; }
        if (!title.trim() || !body.trim()) { app.toast('Title + body required.', 'err'); return; }
        app.update({ announcements: [{ id: uid('pa'), schoolId: null, scope: 'platform', kind, title, body, author: 'SchoolOS Team', date: 'today', priority: kind === 'Urgent' ? 'urgent' : 'normal', audience }, ...app.announcements] });
        close(); app.toast('Platform announcement published.');
      }}>Publish platform-wide</button>
    </div>
  );
}

/* ================= NOTIFICATIONS ================= */
export function NotificationsView() {
  const app = useApp();
  const u = app.user!;
  const list = app.notifications.filter(n => n.userId === u.id).slice(0, 60);
  return (
    <div>
      <div className="row" style={{ justifyContent: 'space-between' }}><h2>🔔 Notifications</h2>
        <button className="btn sm" onClick={() => app.update({ notifications: app.notifications.map(n => n.userId === u.id ? { ...n, read: true } : n) })}>Mark all read</button></div>
      {list.map(n => (
        <button key={n.id} className="card" style={{ display: 'block', width: '100%', textAlign: 'left', marginBottom: 8, opacity: n.read ? 0.7 : 1 }} onClick={() => {
          app.update({ notifications: app.notifications.map(x => x.id === n.id ? { ...x, read: true } : x) });
          app.setView(n.link);
        }}>
          {n.read ? '○' : '●'} {n.text} <span className="small muted">→ {n.link} · {n.time}</span>
        </button>
      ))}
      {list.length === 0 && <Empty text="No notifications." />}
    </div>
  );
}

/* ================= ADMIN (school) ================= */
export function AdminView() {
  const app = useApp();
  const u = app.user!;
  const [tab, setTab] = useState('users');
  if (!canManageSchool(u) && u.role !== 'teacher') return <Empty text="Admins only." />;
  const tabs = u.role === 'teacher' ? ['users'] : ['users', 'branding', 'features', 'info'];
  return (
    <div>
      <h2>⚙️ {u.role === 'teacher' ? 'Class users (read-only directory)' : 'School administration'}</h2>
      <div className="tabs">{tabs.map(t => <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>{t}</button>)}</div>
      {tab === 'users' && <UsersTab />}
      {tab === 'branding' && <BrandingTab />}
      {tab === 'features' && <FeaturesTab />}
      {tab === 'info' && <SchoolInfoTab />}
    </div>
  );
}
function UsersTab() {
  const app = useApp();
  const u = app.user!;
  const [q, setQ] = useState(''); const [role, setRole] = useState('all');
  const [showNew, setShowNew] = useState(false);
  const [f, setF] = useState({ name: '', email: '', role: 'student' as User['role'], classId: '', link: '' });
  const editable = canManageUsers(u);
  let list = app.users.filter(x => x.schoolId === u.schoolId);
  if (q) list = list.filter(x => (x.name + x.email).toLowerCase().includes(q.toLowerCase()));
  if (role !== 'all') list = list.filter(x => x.role === role);
  return (
    <Card title={`👥 Users (${list.length})`} action={editable ? <button className="btn primary sm" onClick={() => setShowNew(true)}>＋ User</button> : undefined}>
      <div className="row"><input className="in" style={{ maxWidth: 220 }} placeholder="Search name/email…" value={q} onChange={e => setQ(e.target.value)} aria-label="Search users" />
        <select className="in" style={{ maxWidth: 150 }} value={role} onChange={e => setRole(e.target.value)} aria-label="Filter role"><option value="all">all roles</option><option value="admin">admin</option><option value="teacher">teacher</option><option value="student">student</option><option value="parent">parent</option></select></div>
      <table className="tbl"><thead><tr><th>Name</th><th>Role</th><th>Email</th><th>Classes</th><th></th></tr></thead>
        <tbody>{list.map(x => <tr key={x.id}><td>{x.name}{x.disabled ? ' (disabled)' : ''}</td><td><span className="badge">{x.role}</span></td><td className="small">{x.email}</td><td className="small">{x.classIds.join(', ')}</td>
          <td>{editable && <span className="row">
            <button className="btn sm" onClick={() => app.update({ users: app.users.map(y => y.id === x.id ? { ...y, disabled: !y.disabled } : y) })}>{x.disabled ? 'Enable' : 'Disable'}</button>
            <button className="btn sm" onClick={() => { app.update({ users: app.users.map(y => y.id === x.id ? { ...y, password: 'demo' } : y) }); app.toast(`Password reset for ${x.name} → “demo”.`); }}>Reset pw</button>
          </span>}</td></tr>)}</tbody></table>
      {showNew && (
        <Modal title="Create user" onClose={() => setShowNew(false)}>
          <div className="grid g2">
            <Field label="Name"><input className="in" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} /></Field>
            <Field label="Email"><input className="in" value={f.email} onChange={e => setF({ ...f, email: e.target.value })} /></Field>
          </div>
          <div className="grid g2">
            <Field label="Role"><select className="in" value={f.role} onChange={e => setF({ ...f, role: e.target.value as User['role'] })}><option value="student">student</option><option value="teacher">teacher</option><option value="parent">parent</option><option value="admin">admin</option></select></Field>
            <Field label="Class"><select className="in" value={f.classId} onChange={e => setF({ ...f, classId: e.target.value })}><option value="">—</option>{app.classes.filter(c => c.schoolId === u.schoolId).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
          </div>
          {f.role === 'parent' && <Field label="Link to student"><select className="in" value={f.link} onChange={e => setF({ ...f, link: e.target.value })}><option value="">—</option>{app.users.filter(x => x.schoolId === u.schoolId && x.role === 'student').map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>}
          <button className="btn primary" onClick={() => {
            if (!f.name.trim() || !f.email.includes('@')) { app.toast('Valid name + email required.', 'err'); return; }
            if (app.users.some(x => x.email.toLowerCase() === f.email.toLowerCase())) { app.toast('Email already exists.', 'err'); return; }
            const nu: User = { id: uid('u'), schoolId: u.schoolId, role: f.role, name: f.name, email: f.email, password: 'demo', classIds: f.classId ? [f.classId] : [], linkedStudentIds: f.role === 'parent' && f.link ? [f.link] : [] };
            const classes = f.classId ? app.classes.map(c => c.id === f.classId ? { ...c, studentIds: f.role === 'student' ? [...c.studentIds, nu.id] : c.studentIds, teacherIds: f.role === 'teacher' ? [...c.teacherIds, nu.id] : c.teacherIds } : c) : app.classes;
            app.update({ users: [...app.users, nu], classes });
            setShowNew(false); setF({ name: '', email: '', role: 'student', classId: '', link: '' });
            app.toast(`Created ${nu.name} (password “demo”).`);
          }}>Create</button>
        </Modal>
      )}
    </Card>
  );
}
function BrandingTab() {
  const app = useApp();
  const u = app.user!;
  const s = app.mySchool()!;
  const set = (p: Partial<School>) => app.update({ schools: app.schools.map(x => x.id === s.id ? { ...x, ...p } : x) });
  const logos = ['🏫', '🌊', '🚀', '🌳', '🎓', '⚽', '🎨', '🔬'];
  return (
    <div className="grid g2">
      <Card title="🎨 Branding">
        <Field label="School name"><input className="in" value={s.name} onChange={e => set({ name: e.target.value })} /></Field>
        <Field label="Logo (emoji)"><div className="row">{logos.map(l => <button key={l} className="btn sm" style={{ borderColor: s.logo === l ? 'var(--school-primary)' : undefined }} onClick={() => set({ logo: l })}>{l}</button>)}</div></Field>
        <div className="grid g3">
          <Field label="Primary"><input type="color" value={s.primaryColor} onChange={e => set({ primaryColor: e.target.value })} /></Field>
          <Field label="Secondary"><input type="color" value={s.secondaryColor} onChange={e => set({ secondaryColor: e.target.value })} /></Field>
          <Field label="Accent"><input type="color" value={s.accentColor} onChange={e => set({ accentColor: e.target.value })} /></Field>
        </div>
        <p className="small muted">Applied instantly via --school-primary / --school-secondary / --school-accent. Saved locally.</p>
      </Card>
      <Card title="👁 Live preview">
        <div className="login-wrap" style={{ minHeight: 0, borderRadius: 12, ['--school-primary' as string]: s.primaryColor, ['--school-secondary' as string]: s.secondaryColor, ['--school-accent' as string]: s.accentColor }}>
          <div className="login-card" style={{ margin: 12 }}>
            <div style={{ textAlign: 'center' }}><div style={{ fontSize: 40 }}>{s.logo}</div><b>{s.name}</b><div className="small muted">Powered by SchoolOS</div></div>
            <div className="row" style={{ marginTop: 8 }}><span className="badge">Dashboard banner</span><button className="btn primary sm">Log in</button><button className="btn sm accent">Accent</button></div>
          </div>
        </div>
      </Card>
    </div>
  );
}
function FeaturesTab() {
  const app = useApp();
  const s = app.mySchool()!;
  const set = (p: Partial<School>) => app.update({ schools: app.schools.map(x => x.id === s.id ? { ...x, ...p } : x) });
  const all = ['timetable', 'assignments', 'behaviour', 'attendance', 'quizzes', 'messages', 'files', 'announcements'];
  const toggle = (arr: string[], m: string) => arr.includes(m) ? arr.filter(x => x !== m) : [...arr, m];
  const move = (dir: number) => {
    const o = [...s.navOrder]; const i = moveIdx.idx;
    const j = i + dir; if (i < 0 || j < 0 || j >= o.length) return;
    [o[i], o[j]] = [o[j], o[i]]; set({ navOrder: o });
  };
  const [moveIdx, setMoveIdx] = useState({ idx: 0 });
  return (
    <div className="grid g2">
      <Card title="🧩 Enabled features">
        {all.map(m => <label key={m} style={{ display: 'block' }}><input type="checkbox" checked={s.enabledFeatures.includes(m)} onChange={() => set({ enabledFeatures: toggle(s.enabledFeatures, m) })} /> {m}</label>)}
      </Card>
      <Card title="🧭 Navigation order">
        <ol>{s.navOrder.map((n, i) => <li key={n}><button className="btn sm" onClick={() => { setMoveIdx({ idx: i }); }}>{n}</button></li>)}</ol>
        <div className="row"><button className="btn sm" onClick={() => move(-1)}>↑ Move selected up</button><button className="btn sm" onClick={() => move(1)}>↓ Move selected down</button></div>
      </Card>
      <Card title="🎓 Student modules">{all.map(m => <label key={m} style={{ display: 'block' }}><input type="checkbox" checked={s.studentModules.includes(m)} onChange={() => set({ studentModules: toggle(s.studentModules, m) })} /> {m}</label>)}</Card>
      <Card title="👪 Parent modules">{all.map(m => <label key={m} style={{ display: 'block' }}><input type="checkbox" checked={s.parentModules.includes(m)} onChange={() => set({ parentModules: toggle(s.parentModules, m) })} /> {m}</label>)}</Card>
    </div>
  );
}
function SchoolInfoTab() {
  const app = useApp();
  const s = app.mySchool()!;
  const set = (p: Partial<School>) => app.update({ schools: app.schools.map(x => x.id === s.id ? { ...x, ...p } : x) });
  return (
    <Card title="🏫 School information">
      <div className="grid g2">
        <Field label="Address"><input className="in" value={s.address} onChange={e => set({ address: e.target.value })} /></Field>
        <Field label="Phone"><input className="in" value={s.phone} onChange={e => set({ phone: e.target.value })} /></Field>
        <Field label="Email"><input className="in" value={s.contactEmail} onChange={e => set({ contactEmail: e.target.value })} /></Field>
        <Field label="Website"><input className="in" value={s.website} onChange={e => set({ website: e.target.value })} /></Field>
      </div>
      <Field label="Term dates"><input className="in" value={s.termDates} onChange={e => set({ termDates: e.target.value })} /></Field>
      <Field label="Description"><textarea className="in" value={s.description} onChange={e => set({ description: e.target.value })} /></Field>
      <button className="btn primary sm" onClick={() => app.toast('School info saved locally.')}>Save</button>
    </Card>
  );
}

/* ================= PLATFORM OWNER ================= */
export function PlatformView() {
  const app = useApp();
  const u = app.user!;
  const [tab, setTab] = useState('schools');
  if (!isOwner(u)) return <Empty text="Platform owner only." />;
  return (
    <div>
      <h2>🌐 Schools & platform</h2>
      <div className="tabs">{['schools', 'announce', 'settings'].map(t => <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>{t}</button>)}</div>
      {tab === 'schools' && <SchoolsTab />}
      {tab === 'announce' && <Card title="📢 New platform announcement"><PlatformAnnForm close={() => app.setView('announcements')} /></Card>}
      {tab === 'settings' && <Card title="Platform settings"><p className="muted">Demo platform: data persists locally. Reset clears everything.</p><div className="row"><button className="btn" onClick={app.resetDemo}>♻ Reset all demo data</button></div></Card>}
    </div>
  );
}
function SchoolsTab() {
  const app = useApp();
  const [showNew, setShowNew] = useState(false);
  const [f, setF] = useState({ name: '', email: '' });
  const [adminEmail, setAdminEmail] = useState<Record<string, string>>({});
  return (
    <div>
      <button className="btn primary sm" onClick={() => setShowNew(true)}>＋ Create school</button>
      <div className="grid g2" style={{ marginTop: 10 }}>
        {app.schools.map(s => {
          const students = app.users.filter(x => x.schoolId === s.id && x.role === 'student').length;
          const teachers = app.users.filter(x => x.schoolId === s.id && x.role === 'teacher').length;
          return (
            <Card key={s.id} title={`${s.logo} ${s.name}`} action={<span className="badge">{s.enabled ? 'enabled' : 'DISABLED'}</span>}>
              <div className="small muted">{students} students · {teachers} teachers · {app.classes.filter(c => c.schoolId === s.id).length} classes · {app.assignments.filter(a => a.schoolId === s.id).length} assignments · {app.results.filter(r => r.schoolId === s.id).length} quiz results</div>
              <p className="small">{s.contactEmail} · {s.website}</p>
              <div className="row">
                <button className="btn sm" onClick={() => app.update({ schools: app.schools.map(x => x.id === s.id ? { ...x, enabled: !x.enabled } : x) })}>{s.enabled ? 'Disable' : 'Enable'}</button>
                <button className="btn sm" onClick={() => app.loginAs(app.users.find(x => x.schoolId === s.id && x.role === 'admin')?.id ?? '')}>👁 Open as admin</button>
              </div>
              <Field label="Set admin email"><span className="row"><input className="in" value={adminEmail[s.id] ?? ''} onChange={e => setAdminEmail({ ...adminEmail, [s.id]: e.target.value })} placeholder="admin name or email" />
                <button className="btn sm" onClick={() => {
                  const v = (adminEmail[s.id] ?? '').trim(); if (!v) return;
                  const adm = app.users.find(x => x.schoolId === s.id && x.role === 'admin');
                  if (adm) app.update({ users: app.users.map(x => x.id === adm.id ? { ...x, email: v.includes('@') ? v : x.email, name: v.includes('@') ? x.name : v } : x) });
                  app.toast('School admin updated.');
                }}>Save</button></span></Field>
            </Card>
          );
        })}
      </div>
      {showNew && (
        <Modal title="Create school" onClose={() => setShowNew(false)}>
          <Field label="School name"><input className="in" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} /></Field>
          <Field label="Contact email"><input className="in" value={f.email} onChange={e => setF({ ...f, email: e.target.value })} /></Field>
          <button className="btn primary" onClick={() => {
            if (!f.name.trim()) { app.toast('Name required.', 'err'); return; }
            const id = uid('sch');
            const s: School = {
              id, name: f.name, logo: '🏫', primaryColor: '#1d4ed8', secondaryColor: '#0f172a', accentColor: '#f59e0b',
              address: '', phone: '', contactEmail: f.email || 'office@school.local', website: '', timezone: 'Europe/London',
              description: 'New school (demo).', termDates: '', enabled: true,
              enabledFeatures: ['timetable', 'assignments', 'behaviour', 'attendance', 'quizzes', 'messages', 'files', 'announcements'],
              navOrder: ['dashboard', 'timetable', 'assignments', 'classes', 'quizzes', 'behaviour', 'attendance', 'messages', 'files', 'announcements', 'notifications'],
              studentModules: ['timetable', 'assignments', 'behaviour', 'attendance', 'quizzes', 'messages', 'files', 'announcements'],
              parentModules: ['timetable', 'assignments', 'announcements'],
              behaviourCategories: { positive: ['Great effort', 'Helping others'], negative: ['Late', 'Disruption'] },
            };
            const adm: User = { id: uid('u'), schoolId: id, role: 'admin', name: 'New Admin', email: `admin@${f.name.toLowerCase().replace(/[^a-z]+/g, '')}.local`, password: 'demo', classIds: [] };
            app.update({ schools: [...app.schools, s], users: [...app.users, adm] });
            setShowNew(false); app.toast(`Created ${s.name} with admin ${adm.email}.`);
          }}>Create</button>
        </Modal>
      )}
    </div>
  );
}
