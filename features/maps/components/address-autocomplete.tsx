"use client";

import { Search } from "lucide-react";
import * as React from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AUTOCOMPLETE_DEBOUNCE_MS } from "@/features/maps/constants";
import {
  fetchAutocompleteSuggestions,
  isGeoapifyConfigured,
} from "@/lib/geoapify/client";
import type {
  GeoapifyAutocompleteSuggestion,
  ParsedGeoAddress,
} from "@/lib/geoapify/types";
import { cn } from "@/lib/utils";

type AddressAutocompleteProps = {
  id?: string;
  label?: string;
  placeholder?: string;
  value?: string;
  onSelect: (address: ParsedGeoAddress) => void;
  disabled?: boolean;
};

export function AddressAutocomplete({
  id = "location-search",
  label = "Search location",
  placeholder = "Search address, area, or city…",
  value = "",
  onSelect,
  disabled = false,
}: AddressAutocompleteProps) {
  const [query, setQuery] = React.useState(value);
  const [suggestions, setSuggestions] = React.useState<
    GeoapifyAutocompleteSuggestion[]
  >([]);
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [activeIndex, setActiveIndex] = React.useState(-1);
  const listId = `${id}-listbox`;
  const abortRef = React.useRef<AbortController | null>(null);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    setQuery(value);
  }, [value]);

  React.useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    };
  }, []);

  const configured = isGeoapifyConfigured();

  function runSearch(text: string) {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    if (text.trim().length < 2) {
      setSuggestions([]);
      setOpen(false);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    void fetchAutocompleteSuggestions(text, { signal: controller.signal })
      .then((items) => {
        setSuggestions(items);
        setOpen(items.length > 0);
        setActiveIndex(items.length > 0 ? 0 : -1);
        if (items.length === 0) {
          setError("No locations found. Try a nearby city or area.");
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setError("Location search failed. Check your connection.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });
  }

  function onInputChange(next: string) {
    setQuery(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      runSearch(next);
    }, AUTOCOMPLETE_DEBOUNCE_MS);
  }

  function chooseSuggestion(suggestion: GeoapifyAutocompleteSuggestion) {
    setQuery(suggestion.label);
    setSuggestions([]);
    setOpen(false);
    setActiveIndex(-1);
    setError(null);
    onSelect(suggestion.address);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((prev) => (prev + 1) % suggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((prev) => (prev <= 0 ? suggestions.length - 1 : prev - 1));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const picked = suggestions[activeIndex];
      if (picked) chooseSuggestion(picked);
    } else if (event.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  if (!configured) {
    return (
      <p className="border-border text-muted-foreground rounded-xl border border-dashed px-3 py-2 text-xs">
        Location search unavailable — set NEXT_PUBLIC_GEOAPIFY_API_KEY. You can
        still pick a point on the map.
      </p>
    );
  }

  return (
    <div className="relative space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Search
          className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
          aria-hidden
        />
        <Input
          id={id}
          value={query}
          disabled={disabled}
          placeholder={placeholder}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            activeIndex >= 0 ? `${id}-option-${activeIndex}` : undefined
          }
          className="h-12 rounded-xl pr-3 pl-10 text-base md:text-base"
          onChange={(event) => onInputChange(event.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) setOpen(true);
          }}
          onBlur={() => {
            window.setTimeout(() => setOpen(false), 120);
          }}
        />
      </div>

      {loading ? (
        <p className="text-muted-foreground text-xs" aria-live="polite">
          Searching…
        </p>
      ) : null}

      {error && !loading ? (
        <p className="text-muted-foreground text-xs" role="status">
          {error}
        </p>
      ) : null}

      {open && suggestions.length > 0 ? (
        <ul
          id={listId}
          role="listbox"
          className="border-border bg-card absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-xl border shadow-[var(--rp-shadow-md)]"
        >
          {suggestions.map((suggestion, index) => (
            <li key={suggestion.id} role="presentation">
              <button
                id={`${id}-option-${index}`}
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                className={cn(
                  "hover:bg-muted w-full px-3 py-2.5 text-left text-sm transition-colors",
                  index === activeIndex && "bg-muted",
                )}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => chooseSuggestion(suggestion)}
              >
                {suggestion.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
