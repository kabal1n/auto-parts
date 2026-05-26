/* eslint-disable */
// Primitives: Button, Tag, TextInput, Card, Stat

const Button = ({ children, variant = 'default', size, icon, onClick, type = 'button', disabled, style }) => {
  const cls = ['btn', `btn-${variant}`, size === 'lg' ? 'btn-lg' : size === 'sm' ? 'btn-sm' : '', icon && !children ? 'btn-icon' : ''].filter(Boolean).join(' ');
  return (
    <button type={type} className={cls} onClick={onClick} disabled={disabled} style={style}>
      {icon}
      {children}
    </button>
  );
};

const Tag = ({ children, variant = 'default' }) => (
  <span className={`tag tag-${variant}`}>{children}</span>
);

const TextInput = ({ value, onChange, placeholder, icon, size, type = 'text', maxLength, autoFocus, onKeyDown }) => {
  if (icon) {
    return (
      <div className="input-icon">
        {icon}
        <input className={`input ${size === 'lg' ? 'input-lg' : ''}`}
          value={value ?? ''} onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder} type={type} maxLength={maxLength}
          autoFocus={autoFocus} onKeyDown={onKeyDown}/>
      </div>
    );
  }
  return (
    <input className={`input ${size === 'lg' ? 'input-lg' : ''}`}
      value={value ?? ''} onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder} type={type} maxLength={maxLength}
      autoFocus={autoFocus} onKeyDown={onKeyDown}/>
  );
};

const Card = ({ children, pad = true, hoverable, style }) => (
  <div className={`card ${pad ? 'card-pad' : ''} ${hoverable ? 'card-hoverable' : ''}`} style={style}>
    {children}
  </div>
);

const StatCard = ({ label, value, suffix, icon, tone }) => (
  <Card pad={false}>
    <div className="stat">
      <div className="stat-label"><span>{label}</span>{icon}</div>
      <div className={`stat-value ${tone === 'pos' ? 'pos' : tone === 'neg' ? 'neg' : ''}`}>
        {value}{suffix && <span className="stat-suffix">&nbsp;{suffix}</span>}
      </div>
    </div>
  </Card>
);

const Modal = ({ open, title, onClose, children, footer, width = 460 }) => {
  if (!open) return null;
  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal" style={{ width }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <span className="title">{title}</span>
          <Button variant="ghost" size="sm" icon={<IconClose size={14}/>} onClick={onClose}/>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
};

const Toast = ({ tone, children }) => (
  <div className={`toast ${tone || ''}`}>
    {tone === 'success' && <IconCheck size={14}/>}
    {tone === 'error' && <IconAlert size={14}/>}
    <span>{children}</span>
  </div>
);

const PageHeader = ({ title, children }) => (
  <div className="page-header">
    <h1>{title}</h1>
    <div className="spacer"/>
    {children}
  </div>
);

const SectionTitle = ({ children, tone, style }) => (
  <h2 style={{
    fontSize: 16, fontWeight: 600, margin: '0 0 12px',
    color: tone === 'danger' ? '#DC2626' : tone === 'warning' ? '#B45309' : 'var(--color-fg-1)',
    ...style,
  }}>{children}</h2>
);

Object.assign(window, {
  Button, Tag, TextInput, Card, StatCard, Modal, Toast, PageHeader, SectionTitle,
});
