import { useEffect, useRef } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { TONES } from '../utils/constants.js';
import { label } from '../utils/format.js';

export function PageHeader({ title, description, actions }) {
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="actions">{actions}</div>}
    </div>
  );
}

export function StatCard({ icon: Icon, label: text, value, sub, tone = 'green' }) {
  return (
    <div className="stat">
      <div className={`stat-icon tone-${tone}`}>
        <Icon size={20} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div className="stat-label">{text}</div>
        <div className="stat-value">{value}</div>
        {sub && <div className="stat-sub">{sub}</div>}
      </div>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, children, action }) {
  return (
    <div className="empty">
      {Icon && (
        <div className="empty-icon">
          <Icon size={26} />
        </div>
      )}
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {action && <div style={{ marginTop: '0.4rem' }}>{action}</div>}
    </div>
  );
}

export function Badge({ tone = 'gray', children, dot = false }) {
  return (
    <span className={`badge tone-${tone}`}>
      {dot && <span className="dot" />}
      {children}
    </span>
  );
}

// kind: order | listing | report | severity | cycle | role
export function StatusBadge({ kind, value, dot = true }) {
  if (!value) return null;
  return (
    <Badge tone={TONES[kind]?.[value] || 'gray'} dot={dot}>
      {label(value)}
    </Badge>
  );
}

function useEscape(onClose) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
}

export function Modal({ open, onClose, title, description, children, footer, size }) {
  useEscape(open ? onClose : null);
  const ref = useRef(null);
  useEffect(() => {
    if (open) ref.current?.querySelector('input, select, textarea')?.focus();
  }, [open]);
  if (!open) return null;
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className={`modal ${size === 'lg' ? 'modal-lg' : ''}`} role="dialog" aria-modal="true" ref={ref}>
        <div className="modal-header">
          <div>
            <h2>{title}</h2>
            {description && <p>{description}</p>}
          </div>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

export function Drawer({ open, onClose, title, subtitle, children }) {
  useEscape(open ? onClose : null);
  if (!open) return null;
  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-modal="true">
        <div className="drawer-header">
          <div style={{ minWidth: 0 }}>
            <h2>{title}</h2>
            {subtitle && <div className="subtle" style={{ marginTop: 4 }}>{subtitle}</div>}
          </div>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="drawer-body">{children}</div>
      </aside>
    </>
  );
}

export function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', danger = true, busy, onConfirm, onClose }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <span className="row">
          {danger && <AlertTriangle size={20} color="var(--red)" />} {title}
        </span>
      }
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button className={`btn ${danger ? 'btn-danger' : ''}`} onClick={onConfirm} disabled={busy}>
            {busy ? <span className="spinner" /> : confirmLabel}
          </button>
        </>
      }
    >
      <p className="muted">{message}</p>
    </Modal>
  );
}

export function PageLoading() {
  return (
    <div className="page-loading">
      <span className="spinner" style={{ width: 28, height: 28, borderWidth: 3 }} />
    </div>
  );
}

export function SkeletonRows({ rows = 4, height = 54 }) {
  return (
    <div className="stack-sm card-body">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="skeleton" style={{ height }} />
      ))}
    </div>
  );
}

export function SkeletonGrid({ count = 6, height = 230 }) {
  return (
    <div className="grid-cards">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="skeleton" style={{ height, borderRadius: 16 }} />
      ))}
    </div>
  );
}

export function FormError({ children }) {
  if (!children) return null;
  return (
    <div className="form-error" role="alert">
      <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
      <span>{children}</span>
    </div>
  );
}

export function Field({ label: text, hint, children, className = '' }) {
  return (
    <label className={`field ${className}`}>
      <span>{text}</span>
      {children}
      {hint && <small className="hint">{hint}</small>}
    </label>
  );
}

export function Avatar({ name, size }) {
  const parts = (name || '?').split(/\s+/).filter(Boolean);
  const text = parts.slice(0, 2).map((p) => p[0].toUpperCase()).join('');
  return <div className={`avatar ${size === 'sm' ? 'avatar-sm' : ''}`}>{text}</div>;
}
