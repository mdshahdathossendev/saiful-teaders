'use client';

import { useEffect, useRef, useState } from 'react';
import { getHistory } from '@/hooks/useAutocomplete';

export default function AutocompleteInput({
  fieldKey,
  value,
  onChange,
  type = 'text',
  inputMode,
  placeholder,
  className,
  readOnly,
  ...rest
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const wrapRef = useRef(null);
  const inputRef = useRef(null);

  /* ইনপুট বদলালে history ফিল্টার করে suggestion তৈরি */
  useEffect(() => {
    if (!value || !value.trim()) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    const history = getHistory(fieldKey);
    const q = value.trim().toLowerCase();
    const matched = history.filter((h) => h.toLowerCase().includes(q) && h.toLowerCase() !== q);
    setSuggestions(matched);
    setOpen(matched.length > 0);
    setActiveIdx(-1);
  }, [value, fieldKey]);

  /* বাইরে ক্লিক করলে বন্ধ */
  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selectSuggestion = (val) => {
    onChange(val);
    setOpen(false);
    setActiveIdx(-1);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Enter' && activeIdx >= 0) {
      e.preventDefault();
      selectSuggestion(suggestions[activeIdx]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  /* ফোকাস পেলে history দেখাও (value খালি হলেও) */
  const handleFocus = () => {
    const history = getHistory(fieldKey);
    if (!value || !value.trim()) {
      if (history.length > 0) {
        setSuggestions(history);
        setOpen(true);
      }
    }
  };

  return (
    <div className="autocomplete-wrap" ref={wrapRef}>
      <input
        ref={inputRef}
        type={type}
        inputMode={inputMode}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        placeholder={placeholder}
        className={className}
        readOnly={readOnly}
        autoComplete="off"
        {...rest}
      />
      {open && suggestions.length > 0 && (
        <ul className="autocomplete-list" role="listbox">
          {suggestions.map((s, i) => (
            <li
              key={s}
              role="option"
              aria-selected={i === activeIdx}
              className={`autocomplete-item${i === activeIdx ? ' active' : ''}`}
              onMouseDown={(e) => { e.preventDefault(); selectSuggestion(s); }}
            >
              <span className="ac-icon">🕐</span>
              <span className="ac-text">{s}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
