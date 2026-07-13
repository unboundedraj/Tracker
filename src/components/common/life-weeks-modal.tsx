"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const STORAGE_KEY = "tracker-life-birthdate";
const TOTAL_YEARS = 90;
const WEEKS_PER_YEAR = 52;
const TOTAL_WEEKS = TOTAL_YEARS * WEEKS_PER_YEAR; // 4,680
const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

type Props = { onClose: () => void };

function parseStoredDate(raw: string | null): Date | null {
  if (!raw) return null;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

function toInputValue(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function readableDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", { day: "numeric", month: "long", year: "numeric" }).format(date);
}

function computeAge(birth: Date, now: Date) {
  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  if (months < 0 || (months === 0 && now.getDate() < birth.getDate())) {
    years--;
    months += 12;
  }
  if (now.getDate() < birth.getDate()) {
    months = Math.max(0, months - 1);
  }
  return { years, months };
}

export default function LifeWeeksModal({ onClose }: Props) {
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [mounted, setMounted] = useState(false);
  const backdropRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Hydrate: show localStorage immediately, then sync with DB
  useEffect(() => {
    const localRaw = localStorage.getItem(STORAGE_KEY);
    const localDate = parseStoredDate(localRaw);
    if (localDate) {
      setBirthDate(localDate);
      setInputValue(toInputValue(localDate));
    }
    setMounted(true);

    fetch("/api/settings")
      .then((r) => (r.ok ? (r.json() as Promise<{ birthDate: string | null }>) : Promise.reject()))
      .then(({ birthDate }) => {
        if (birthDate) {
          const parsed = parseStoredDate(birthDate);
          if (parsed) {
            setBirthDate(parsed);
            setInputValue(toInputValue(parsed));
            localStorage.setItem(STORAGE_KEY, birthDate);
          }
        }
      })
      .catch(() => { /* stay with local data on API error */ });
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    if (isEditing) inputRef.current?.focus();
  }, [isEditing]);

  const now = useMemo(() => new Date(), []);
  const maxInput = toInputValue(now);

  const weeksElapsed = useMemo(() => {
    if (!birthDate) return 0;
    return Math.min(TOTAL_WEEKS, Math.max(0, Math.floor((now.getTime() - birthDate.getTime()) / MS_PER_WEEK)));
  }, [birthDate, now]);

  const stats = useMemo(() => {
    if (!birthDate) return null;
    const age = computeAge(birthDate, now);
    const remaining = Math.max(0, TOTAL_WEEKS - weeksElapsed);
    const yearsLeft = (remaining / WEEKS_PER_YEAR).toFixed(1);
    const pct = Math.round((weeksElapsed / TOTAL_WEEKS) * 100);
    return { age, remaining, yearsLeft, pct };
  }, [birthDate, now, weeksElapsed]);

  const saveBirthDate = () => {
    const parsed = parseStoredDate(inputValue);
    if (!parsed || parsed > now) return;
    localStorage.setItem(STORAGE_KEY, inputValue);
    setBirthDate(parsed);
    setIsEditing(false);
    fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ birthDate: inputValue }),
    }).catch(() => { /* local save already done */ });
  };

  const clearBirthDate = () => {
    localStorage.removeItem(STORAGE_KEY);
    setBirthDate(null);
    setInputValue("");
    setIsEditing(false);
    fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ birthDate: null }),
    }).catch(() => { /* local clear already done */ });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") saveBirthDate();
    if (e.key === "Escape") { e.stopPropagation(); setIsEditing(false); }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === backdropRef.current) onClose();
  };

  const getCellClass = (idx: number) => {
    if (idx < weeksElapsed) return "lw-cell lw-cell--past";
    if (idx === weeksElapsed) return "lw-cell lw-cell--now";
    return "lw-cell";
  };

  const showOnboarding = mounted && !birthDate && !isEditing;
  const showGrid = mounted && (!!birthDate || isEditing);

  return (
    <div ref={backdropRef} className="lw-backdrop" onClick={handleBackdropClick}>
      <div className="lw-modal">

        {/* ── Header ── */}
        <div className="lw-header">
          <div className="lw-header__left">
            <span className="lw-header__icon" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 7S3.2 2.5 7 2.5 13 7 13 7 10.8 11.5 7 11.5 1 7 1 7z"/>
                <circle cx="7" cy="7" r="2"/>
              </svg>
            </span>
            <div>
              <p className="lw-header__eyebrow">A perspective tool</p>
              <h2 className="lw-header__title">Life in Weeks</h2>
            </div>
          </div>
          <div className="lw-header__right">
            {birthDate && !isEditing && (
              <button
                type="button"
                className="lw-btn lw-btn--ghost"
                onClick={() => setIsEditing(true)}
                title="Change birth date"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M7.5 1.5l3 3-6 6H1.5V8.5l6-7z"/>
                </svg>
                Edit
              </button>
            )}
            <button type="button" className="lw-close" onClick={onClose} aria-label="Close">✕</button>
          </div>
        </div>

        {/* ── Scrollable content ── */}
        <div className="lw-body">

          {/* Onboarding */}
          {showOnboarding && (
            <div className="lw-onboarding">
              <div className="lw-onboarding__eye" aria-hidden="true">
                <svg viewBox="0 0 60 40" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 20S13 4 30 4s28 16 28 16-11 16-28 16S2 20 2 20z"/>
                  <circle cx="30" cy="20" r="7"/>
                  <circle cx="30" cy="20" r="3" fill="currentColor" stroke="none" opacity="0.7"/>
                </svg>
              </div>
              <p className="lw-onboarding__headline">90 years. 4,680 weeks.</p>
              <p className="lw-onboarding__sub">
                Most of them are already spent. Enter your birth date and see exactly where you stand.
              </p>
              <div className="lw-onboarding__form">
                <label className="lw-onboarding__label" htmlFor="lw-dob-init">Date of birth</label>
                <div className="lw-onboarding__row">
                  <input
                    id="lw-dob-init"
                    type="date"
                    className="lw-date-input"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    max={maxInput}
                    autoFocus
                  />
                  <button
                    type="button"
                    className="lw-btn lw-btn--primary"
                    onClick={saveBirthDate}
                    disabled={!inputValue}
                  >
                    Reveal my grid →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Edit birth date */}
          {showGrid && isEditing && (
            <div className="lw-settings">
              <label className="lw-settings__label" htmlFor="lw-dob-edit">Date of birth</label>
              <div className="lw-settings__row">
                <input
                  ref={inputRef}
                  id="lw-dob-edit"
                  type="date"
                  className="lw-date-input"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  max={maxInput}
                />
                <button type="button" className="lw-btn lw-btn--primary" onClick={saveBirthDate} disabled={!inputValue}>Save</button>
                <button type="button" className="lw-btn lw-btn--ghost" onClick={() => setIsEditing(false)}>Cancel</button>
                <button type="button" className="lw-btn lw-btn--danger" onClick={clearBirthDate}>Reset</button>
              </div>
            </div>
          )}

          {/* Stats + grid */}
          {showGrid && !isEditing && birthDate && stats && (
            <>
              {/* Stats strip */}
              <div className="lw-stats">
                <div className="lw-stats__block">
                  <span className="lw-stats__val">{stats.age.years}<em>y</em> {stats.age.months}<em>m</em></span>
                  <span className="lw-stats__lbl">Age</span>
                </div>
                <div className="lw-stats__sep"/>
                <div className="lw-stats__block">
                  <span className="lw-stats__val">{weeksElapsed.toLocaleString()}<em> / {TOTAL_WEEKS.toLocaleString()}</em></span>
                  <span className="lw-stats__lbl">Weeks elapsed</span>
                </div>
                <div className="lw-stats__sep"/>
                <div className="lw-stats__block">
                  <span className="lw-stats__val">{stats.yearsLeft}<em>y</em></span>
                  <span className="lw-stats__lbl">Remaining</span>
                </div>
                <div className="lw-stats__sep"/>
                <div className="lw-stats__block lw-stats__block--pct">
                  <span className="lw-stats__val">{stats.pct}<em>%</em></span>
                  <span className="lw-stats__lbl">Used</span>
                </div>
                <span className="lw-stats__born">Born {readableDate(birthDate)}</span>
              </div>

              {/* Legend */}
              <div className="lw-legend">
                <span className="lw-legend__item"><span className="lw-legend__dot lw-legend__dot--past"/>Elapsed</span>
                <span className="lw-legend__item"><span className="lw-legend__dot lw-legend__dot--now"/>This week</span>
                <span className="lw-legend__item"><span className="lw-legend__dot lw-legend__dot--future"/>Remaining</span>
                <span className="lw-legend__note">1 square = 1 week · Each row = 1 year</span>
              </div>

              {/* Grid */}
              <div className="lw-grid-wrap">
                <div className="lw-grid" role="img" aria-label={`Life grid: ${weeksElapsed} of ${TOTAL_WEEKS} weeks elapsed`}>
                  {Array.from({ length: TOTAL_YEARS }, (_, yi) => (
                    <div key={yi} className="lw-row">
                      <span className="lw-row__label">
                        {yi === 0 ? "1" : (yi + 1) % 10 === 0 ? String(yi + 1) : ""}
                      </span>
                      {Array.from({ length: WEEKS_PER_YEAR }, (_, wi) => (
                        <div key={wi} className={getCellClass(yi * WEEKS_PER_YEAR + wi)} />
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              {/* Quote */}
              <div className="lw-quote">
                <div className="lw-quote__rule"/>
                <p className="lw-quote__text">
                  This is what a lifetime of 90 years looks like.
                  Have a look at the time you have left —
                  and tell me if you still need more time,
                  and if you still care what others would say.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
