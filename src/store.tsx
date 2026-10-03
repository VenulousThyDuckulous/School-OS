import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { User, School, Announcement, Notification, QuizSession } from './types';
import { seed, type Seed } from './seed';
import { storage, SESSION_KEY } from './storage';

interface Toast { id: string; text: string; kind: 'ok' | 'err' | 'info'; }
interface Ctx extends Seed {
  user: User | null;
  login(email: string, password: string, schoolId: string): string | null;
  logout(): void;
  loginAs(id: string): void;
  view: string; setView(v: string): void;
  toasts: Toast[]; toast(text: string, kind?: Toast['kind']): void;
  // generic updaters (all enforce schoolId isolation at call sites)
  update(part: Partial<Seed>): void;
  resetDemo(): void;
  mySchool(): School | undefined;
  schoolOf(id: string | null): School | undefined;
  // scoped queries
  scoped<T extends { schoolId: string | null }>(items: T[]): T[];
  notify(userId: string, text: string, link: string, schoolId: string | null): void;
  sessions: QuizSession[]; setSessions(s: QuizSession[]): void;
}

const C = createContext<Ctx | null>(null);
export const useApp = () => { const v = useContext(C); if (!v) throw new Error('no ctx'); return v; };
let n = 0;
const uid = (p: string) => `${p}-${Date.now().toString(36)}-${(n++).toString(36)}${Math.floor(Math.random() * 99)}`;

const initial: Seed = seed();

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<Seed>(() => storage.load(initial));
  const [userId, setUserId] = useState<string | null>(() => { try { return localStorage.getItem(SESSION_KEY); } catch { return null; } });
  const [view, setView] = useState('dashboard');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [sessions, setSessionsState] = useState<QuizSession[]>(() => { try { return JSON.parse(localStorage.getItem('schoolos-sessions') ?? '[]'); } catch { return []; } });

  useEffect(() => { storage.save(data); }, [data]);
  useEffect(() => { try { localStorage.setItem('schoolos-sessions', JSON.stringify(sessions)); } catch { /* noop */ } }, [sessions]);

  const toast = (text: string, kind: Toast['kind'] = 'ok') => {
    const t = { id: uid('t'), text, kind };
    setToasts(p => [...p, t]);
    setTimeout(() => setToasts(p => p.filter(x => x.id !== t.id)), 3600);
  };
  const update = (part: Partial<Seed>) => setData(d => ({ ...d, ...part }));
  const setSessions = (s: QuizSession[]) => setSessionsState(s);

  const user = data.users.find(u => u.id === userId && !u.disabled) ?? null;
  const mySchool = () => data.schools.find(s => s.id === user?.schoolId);
  const schoolOf = (id: string | null) => data.schools.find(s => s.id === id);
  const scoped = <T extends { schoolId: string | null }>(items: T[]): T[] => {
    if (!user) return [];
    if (user.role === 'owner') return items;
    return items.filter(i => i.schoolId === user.schoolId);
  };
  const notify = (forUser: string, text: string, link: string, schoolId: string | null) => {
    const nt: Notification = { id: uid('n'), schoolId, userId: forUser, text, link, time: 'now', read: false };
    setData(d => ({ ...d, notifications: [nt, ...d.notifications] }));
  };

  const login = (email: string, password: string, schoolId: string): string | null => {
    const e = email.trim().toLowerCase();
    // owner bypasses school select
    let u = data.users.find(x => x.email.toLowerCase() === e && !x.disabled);
    if (!u) return 'No account with that email in this demo.';
    if (u.password !== password) return 'Wrong password (demo passwords are “demo”; use quick-login).';
    if (u.role !== 'owner' && u.schoolId !== schoolId) return 'That user does not belong to the selected school. Switch school.';
    const sch = data.schools.find(s => s.id === u!.schoolId);
    if (u.role !== 'owner' && sch && !sch.enabled) return 'This school is disabled. Contact the platform owner.';
    setUserId(u.id);
    try { localStorage.setItem(SESSION_KEY, u.id); } catch { /* noop */ }
    setView('dashboard');
    return null;
  };
  const loginAs = (id: string) => { setUserId(id); try { localStorage.setItem(SESSION_KEY, id); } catch { /* noop */ } setView('dashboard'); };
  const logout = () => { setUserId(null); try { localStorage.removeItem(SESSION_KEY); } catch { /* noop */ } setView('dashboard'); };
  const resetDemo = () => { const s = seed(); setData(s); setSessionsState([]); toast('Demo data reset.', 'info'); };

  const value: Ctx = useMemo(() => ({
    ...data, user, login, logout, loginAs, view, setView, toasts, toast,
    update, resetDemo, mySchool, schoolOf, scoped, notify, sessions, setSessions,
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [data, userId, view, toasts, sessions]);

  return <C.Provider value={value}>{children}</C.Provider>;
}
export { uid };
