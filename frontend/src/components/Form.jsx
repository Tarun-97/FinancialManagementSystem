import React from 'react';

export default function Form({ onSubmit, children, submitLabel = 'Save', busy = false }) {
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit && onSubmit(e); }} style={{ display: 'grid', gap: 8 }}>
      {children}
      <button type="submit" disabled={busy} style={{ padding: '8px 12px' }}>
        {busy ? 'Saving…' : submitLabel}
      </button>
    </form>
  );
}
