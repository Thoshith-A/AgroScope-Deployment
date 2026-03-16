/**
 * Searchable waste type selector — international agricultural waste types.
 * Search bar filters by label; dropdown shows matching options with icons.
 */

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Search } from "lucide-react";
import { CROP_WASTE_CONFIG } from "@/lib/cropIcons";
interface WasteTypeSearchSelectProps {
  value: string;
  onValueChange: (label: string) => void;
  options: string[];
  id?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
}

function resolveConfig(label: string) {
  const entry = Object.values(CROP_WASTE_CONFIG).find(
    (c) => c.label.toLowerCase() === label.trim().toLowerCase()
  );
  return entry;
}

export function WasteTypeSearchSelect({
  value,
  onValueChange,
  options,
  id = "waste-type",
  placeholder = "Select waste type",
  searchPlaceholder = "Search waste type...",
  className = "",
}: WasteTypeSearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const searchLower = search.trim().toLowerCase();
  const filtered =
    searchLower === ""
      ? options
      : options.filter((label) => label.toLowerCase().includes(searchLower));

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentConfig = resolveConfig(value);
  const displayValue = value || placeholder;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        id={id}
        onClick={() => setOpen((o) => !o)}
        className="flex h-12 w-full items-center justify-between gap-2 rounded-xl border border-input bg-background px-3 py-2 text-left text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Waste type"
      >
        {currentConfig ? (
          <span className="flex items-center gap-2">
            <currentConfig.Icon size={16} color={currentConfig.color} />
            <span className="text-sm">
              {currentConfig.emoji} {currentConfig.label}
            </span>
          </span>
        ) : (
          <span className="text-muted-foreground">{displayValue}</span>
        )}
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          className="absolute top-full left-0 z-50 mt-1 w-full rounded-xl border border-green-500/20 bg-background shadow-lg"
          role="listbox"
        >
          <div className="border-b border-green-500/10 p-2">
            <div className="flex items-center gap-2 rounded-lg border border-input bg-muted/30 px-2 py-1.5">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                autoFocus
                onKeyDown={(e) => e.stopPropagation()}
              />
            </div>
          </div>
          <div className="max-h-[280px] overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-4 text-center text-sm text-muted-foreground">
                No waste type found. Try a different search.
              </p>
            ) : (
              filtered.map((label) => {
                const config = resolveConfig(label);
                const isSelected = value === label;
                return (
                  <button
                    key={label}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      onValueChange(label);
                      setOpen(false);
                      setSearch("");
                    }}
                    className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-green-500/10 ${
                      isSelected ? "bg-green-500/15 text-green-800 dark:text-green-300" : ""
                    }`}
                  >
                    {config ? (
                      <>
                        <config.Icon size={16} color={config.color} />
                        <span>
                          {config.emoji} {config.label}
                        </span>
                      </>
                    ) : (
                      label
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
