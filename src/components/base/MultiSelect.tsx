import { useState, useRef, useEffect, useMemo } from 'react';

interface MultiSelectOption {
  id: string;
  label: string;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  emptyMessage?: string;
}

export default function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = 'Seleccionar...',
  searchPlaceholder = 'Buscar...',
  disabled = false,
  emptyMessage = 'Sin opciones',
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = useMemo(() => {
    if (!search) return options;
    const q = search.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, search]);

  const selectedLabels = useMemo(() => {
    return options.filter((o) => selected.includes(o.id)).map((o) => o.label);
  }, [options, selected]);

  const toggle = (id: string) => {
    const next = selected.includes(id)
      ? selected.filter((s) => s !== id)
      : [...selected, id];
    onChange(next);
  };

  const selectAll = () => {
    onChange(options.map((o) => o.id));
  };

  const clearAll = () => {
    onChange([]);
  };

  const allSelected = options.length > 0 && selected.length === options.length;
  const someSelected = selected.length > 0 && selected.length < options.length;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full h-10 bg-background-100 border rounded-lg px-3 text-sm text-left flex items-center justify-between gap-2 outline-none transition-all ${
          disabled
            ? 'border-secondary-500/20 opacity-40 cursor-not-allowed'
            : isOpen
              ? 'border-primary-500/40 ring-1 ring-primary-500/15'
              : 'border-secondary-500/20 hover:border-secondary-500/40'
        }`}
      >
        <span className={`truncate flex-1 ${selected.length === 0 ? 'text-foreground-500' : 'text-foreground-200'}`}>
          {selected.length === 0
            ? placeholder
            : selected.length === options.length
              ? `Todos (${selected.length})`
              : selected.length === 1
                ? selectedLabels[0]
                : `${selected.length} seleccionados`}
        </span>
        <span className="w-4 h-4 flex items-center justify-center shrink-0 text-foreground-500">
          <i className={`text-xs ${isOpen ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line'}`}></i>
        </span>
      </button>

      {isOpen && !disabled && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 glass-panel-strong rounded-xl animate-scale-in overflow-hidden max-h-72 flex flex-col">
          <div className="px-3 py-2 border-b border-secondary-500/10">
            <div className="relative">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-foreground-500 w-3.5 h-3.5 flex items-center justify-center">
                <i className="ri-search-line text-xs"></i>
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full h-8 bg-background-100 border border-secondary-500/20 rounded-md pl-7 pr-2 text-xs text-foreground-300 placeholder:text-foreground-600 outline-none focus:border-primary-500/40"
              />
            </div>
          </div>

          <div className="flex items-center gap-1 px-3 py-1.5 border-b border-secondary-500/10">
            <button
              type="button"
              onClick={selectAll}
              className="text-2xs text-primary-400 hover:text-primary-300 font-medium px-2 py-0.5 rounded hover:bg-primary-500/10 transition-colors whitespace-nowrap"
            >
              Todos
            </button>
            <button
              type="button"
              onClick={clearAll}
              className="text-2xs text-foreground-500 hover:text-foreground-300 font-medium px-2 py-0.5 rounded hover:bg-background-200/50 transition-colors whitespace-nowrap"
            >
              Limpiar
            </button>
          </div>

          <div className="overflow-y-auto flex-1 py-1">
            {filtered.length === 0 ? (
              <p className="px-4 py-3 text-xs text-foreground-500 text-center">{emptyMessage}</p>
            ) : (
              filtered.map((opt) => {
                const isSel = selected.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => toggle(opt.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors ${
                      isSel
                        ? 'text-primary-400 bg-primary-500/5'
                        : 'text-foreground-400 hover:text-foreground-200 hover:bg-background-200/50'
                    }`}
                  >
                    <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${
                      isSel
                        ? 'bg-primary-500 border-primary-500'
                        : 'border-secondary-500/30'
                    }`}>
                      {isSel && <i className="ri-check-line text-xs text-white"></i>}
                    </span>
                    <span className="truncate">{opt.label}</span>
                  </button>
                );
              })
            )}
          </div>

          {selected.length > 0 && (
            <div className="px-3 py-2 border-t border-secondary-500/10 bg-background-100/50">
              <span className="text-2xs text-foreground-600">{selected.length} seleccionado{selected.length !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}