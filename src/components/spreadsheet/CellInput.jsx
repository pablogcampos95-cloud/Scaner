import { useEffect, useState } from 'react';

export default function CellInput({ cell, active, onFocus, onChange, onNavigate }) {
  const [draft, setDraft] = useState(cell?.rawInput ?? '');

  useEffect(() => {
    setDraft(active ? (cell?.rawInput ?? '') : (cell?.displayValue ?? cell?.rawInput ?? ''));
  }, [active, cell?.displayValue, cell?.rawInput]);

  const locked = cell.locked || cell.editable === false;

  return (
    <input
      className={[
        'spreadsheet-cell',
        active ? 'spreadsheet-cell--active' : '',
        locked ? 'spreadsheet-cell--locked' : '',
        cell.isTarget ? 'spreadsheet-cell--target' : '',
        cell.error ? 'spreadsheet-cell--error' : '',
      ].filter(Boolean).join(' ')}
      value={draft}
      readOnly={locked}
      title={cell.error || ''}
      onFocus={() => onFocus(cell.id)}
      onChange={(event) => {
        setDraft(event.target.value);
        onChange(cell.id, event.target.value);
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          onNavigate(cell.id, 'down');
        }
        if (event.key === 'ArrowDown') onNavigate(cell.id, 'down');
        if (event.key === 'ArrowUp') onNavigate(cell.id, 'up');
        if (event.key === 'ArrowLeft' && event.currentTarget.selectionStart === 0) onNavigate(cell.id, 'left');
        if (event.key === 'ArrowRight' && event.currentTarget.selectionStart === event.currentTarget.value.length) onNavigate(cell.id, 'right');
      }}
    />
  );
}
