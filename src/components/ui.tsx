import React, { useState } from 'react';
import { useApp } from '../store';

export function Card({ title, action, children }: { title?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="card" aria-label={title}>
      {(title || action) && <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}><h3>{title}</h3><span>{action}</span></div>}
      {children}
    </section>
  );
}

export function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="card"><div className="muted small">{label}</div><div style={{ fontSize: 28, fontWeight: 800 }}>{value}</div>{sub && <div className="muted small">{sub}</div>}</div>
  );
}

export function Modal({ title, onClose, children }: { title: string; onClose(): void; children: React.ReactNode }) {
  return (
    <div className="modal-veil" onClick={onClose} role="dialog" aria-modal="true" aria-label={title}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="row" style={{ justifyContent: 'space-between' }}><h3 style={{ margin: 0 }}>{title}</h3><button className="btn sm" onClick={onClose} aria-label="Close">✕</button></div>
        <div style={{ marginTop: 10 }}>{children}</div>
      </div>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label style={{ display: 'block', marginBottom: 10 }}><span className="small muted">{label}</span><br />{children}</label>;
}

export function Bars({ data }: { data: { label: string; value: number; max?: number }[] }) {
  const max = Math.max(1, ...data.map(d => d.max ?? d.value));
  return (
    <div>
      {data.map(d => (
        <div key={d.label} className="row" style={{ marginBottom: 6 }}>
          <span className="small" style={{ width: 130 }}>{d.label}</span>
          <div className="bar" style={{ flex: 1 }} role="img" aria-label={`${d.label}: ${d.value}`}><div style={{ width: `${Math.round((d.value / max) * 100)}%` }} /></div>
          <b>{d.value}</b>
        </div>
      ))}
    </div>
  );
}

export function Empty({ text }: { text: string }) { return <p className="muted">{text}</p>; }

export function Toasts() {
  const { toasts } = useApp();
  return <div className="toasts" aria-live="polite">{toasts.map(t => <div key={t.id} className={`toast ${t.kind}`}>{t.text}</div>)}</div>;
}

export function Confirm({ text, onYes, onNo }: { text: string; onYes(): void; onNo(): void }) {
  return (
    <Modal title="Confirm" onClose={onNo}>
      <p>{text}</p>
      <div className="row"><button className="btn danger" onClick={onYes}>Confirm</button><button className="btn" onClick={onNo}>Cancel</button></div>
    </Modal>
  );
}

export function useModal() {
  const [open, setOpen] = useState(false);
  return { open, show: () => setOpen(true), hide: () => setOpen(false) };
}
