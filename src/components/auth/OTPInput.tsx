// components/auth/OTPInput.tsx
// 6-box OTP input — auto-advances, supports paste, backspace navigation.
// Accepts both numeric and alphanumeric codes (controlled by `mode` prop).

import { useRef, KeyboardEvent, ClipboardEvent } from 'react';

interface OTPInputProps {
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
  length?: number;
  /** 'numeric' (default) restricts to digits; 'alphanumeric' allows A-Z 0-9 */
  mode?: 'numeric' | 'alphanumeric';
}

export default function OTPInput({
  value,
  onChange,
  disabled = false,
  length = 6,
  mode = 'numeric',
}: OTPInputProps) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length }, (_, i) => value[i] || '');

  const focus = (i: number) => refs.current[i]?.focus();

  const sanitize = (raw: string) =>
    mode === 'numeric'
      ? raw.replace(/\D/g, '')
      : raw.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

  const update = (newDigits: string[]) => onChange(newDigits.join(''));

  const handleChange = (i: number, raw: string) => {
    // maxLength=2 so when a box already has a char the new keystroke gives 2 chars;
    // take the last one so the new key wins over the existing char.
    const cleaned = sanitize(raw);
    const ch = cleaned.slice(-1);
    const next = [...digits];
    next[i] = ch;
    update(next);
    if (ch && i < length - 1) focus(i + 1);
  };

  const handleKeyDown = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (digits[i]) {
        const next = [...digits];
        next[i] = '';
        update(next);
      } else if (i > 0) {
        focus(i - 1);
      }
    } else if (e.key === 'ArrowLeft' && i > 0) {
      focus(i - 1);
    } else if (e.key === 'ArrowRight' && i < length - 1) {
      focus(i + 1);
    }
  };

  const handlePaste = (e: ClipboardEvent) => {
    e.preventDefault();
    const text = sanitize(e.clipboardData.getData('text')).slice(0, length);
    const next = Array.from({ length }, (_, i) => text[i] || '');
    update(next);
    focus(Math.min(text.length, length - 1));
  };

  return (
    <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'center', margin: '1.5rem 0' }}>
      {Array.from({ length }, (_, i) => (
        <input
          key={i}
          ref={el => { refs.current[i] = el; }}
          type="text"
          inputMode={mode === 'numeric' ? 'numeric' : 'text'}
          autoComplete="one-time-code"
          maxLength={2}
          value={digits[i]}
          disabled={disabled}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={e => e.target.select()}
          style={{
            width: '3rem',
            height: '3.2rem',
            textAlign: 'center',
            fontSize: '1.25rem',
            fontWeight: 700,
            textTransform: mode === 'alphanumeric' ? 'uppercase' : undefined,
            border: digits[i] ? '2px solid var(--primary)' : '2px solid #d4d4d8',
            borderRadius: '0.5rem',
            outline: 'none',
            background: disabled ? '#f4f4f5' : '#fff',
            color: 'var(--primary)',
            transition: 'border-color 0.15s, box-shadow 0.15s',
            boxShadow: digits[i] ? '0 0 0 3px var(--primary-light)' : 'none',
          }}
        />
      ))}
    </div>
  );
}

