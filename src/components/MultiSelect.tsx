import { useEffect, useId, useRef, useState } from 'react';

export interface Option {
  id: number;
  name: string;
  iconUrl?: string;
}

interface Props {
  label: string;
  options: Option[];
  selected: number[];
  onChange(ids: number[]): void;
  /** IDs added by the smart search; shown as checked but locked. */
  implied?: number[];
}

export function MultiSelect({ label, options, selected, onChange, implied = [] }: Props) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const root = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const count = new Set([...selected, ...implied]).size;
  const visible = options.filter((o) => o.name.toLowerCase().includes(filter.toLowerCase()));
  const toggle = (id: number) =>
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);

  return (
    <div className="multiselect" ref={root}>
      <button
        type="button"
        className={`ms-trigger ${count ? 'has-value' : ''}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((o) => !o)}
      >
        <span>{label}</span>
        {count > 0 && <span className="ms-count">{count}</span>}
        <span className="ms-caret" aria-hidden>
          ▾
        </span>
      </button>
      {open && (
        <div className="ms-panel" role="dialog" aria-label={label}>
          {options.length > 8 && (
            <input
              className="ms-filter"
              placeholder={`Filter ${label.toLowerCase()}…`}
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              autoFocus
            />
          )}
          <ul id={listId} role="listbox" aria-multiselectable className="ms-list">
            {visible.map((o) => {
              const isImplied = implied.includes(o.id);
              const checked = isImplied || selected.includes(o.id);
              return (
                <li key={o.id}>
                  <label className={`ms-option ${isImplied ? 'implied' : ''}`}>
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={isImplied}
                      onChange={() => toggle(o.id)}
                    />
                    {o.iconUrl && <img src={o.iconUrl} alt="" className="ms-icon" />}
                    <span>{o.name}</span>
                    {isImplied && <span className="ms-hint">from search</span>}
                  </label>
                </li>
              );
            })}
            {!visible.length && <li className="ms-empty">No matches</li>}
          </ul>
          {selected.length > 0 && (
            <button type="button" className="ms-clear" onClick={() => onChange([])}>
              Clear selection
            </button>
          )}
        </div>
      )}
    </div>
  );
}
