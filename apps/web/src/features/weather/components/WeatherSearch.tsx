import { useEffect, useId, useState, type KeyboardEvent } from 'react';
import { useGeoSuggest } from '../hooks/useGeoSuggest';
import type { GeoSuggestion } from '../types';

type Props = {
  onSelect: (suggestion: GeoSuggestion) => void;
};

export function WeatherSearch({ onSelect }: Props) {
  const listId = useId();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const { suggestions, loading, error } = useGeoSuggest(query);

  useEffect(() => {
    setActiveIndex(0);
    setOpen(query.trim().length >= 2 && (suggestions.length > 0 || loading));
  }, [query, suggestions, loading]);

  function choose(item: GeoSuggestion) {
    setQuery(item.label);
    setOpen(false);
    onSelect(item);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % suggestions.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => (index - 1 + suggestions.length) % suggestions.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const item = suggestions[activeIndex];
      if (item) choose(item);
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div className="weather-search">
      <label className="weather-search-label">
        Search city / district / province
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => {
            if (suggestions.length) setOpen(true);
          }}
          placeholder="e.g. Ha Noi, Ha Long…"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
        />
      </label>
      {loading ? <p className="muted suggest-hint">Searching…</p> : null}
      {error ? <p className="error suggest-hint">{error}</p> : null}
      {open && suggestions.length > 0 ? (
        <ul id={listId} className="suggest-list" role="listbox">
          {suggestions.map((item, index) => (
            <li key={item.id} role="option" aria-selected={index === activeIndex}>
              <button
                type="button"
                className={index === activeIndex ? 'active' : undefined}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(item)}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
