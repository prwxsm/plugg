import { useState, useMemo } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { todayISO } from "@/lib/plugg";

interface PluggDatePickerProps {
  value: string;
  onChange: (date: string) => void;
  minDate?: string;
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const DAYS_OF_WEEK = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

export function PluggDatePicker({ value, onChange, minDate = todayISO() }: PluggDatePickerProps) {
  const initialDate = useMemo(() => {
    const d = new Date(`${value || minDate}T00:00:00`);
    return isNaN(d.getTime()) ? new Date() : d;
  }, [value, minDate]);

  const [currentYear, setCurrentYear] = useState(initialDate.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(initialDate.getMonth());

  const todayStr = todayISO();
  const todayDate = new Date(`${todayStr}T00:00:00`);

  // Presets
  const tomorrowStr = useMemo(() => {
    const d = new Date(todayDate);
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }, [todayDate]);

  const fridayStr = useMemo(() => {
    const d = new Date(todayDate);
    const day = d.getDay(); // 0 is Sunday, 5 is Friday
    let diff = (5 - day + 7) % 7;
    if (diff === 0) diff = 7; // Next Friday if today is Friday
    d.setDate(d.getDate() + diff);
    return d.toISOString().slice(0, 10);
  }, [todayDate]);

  // Days in current view month
  const { daysInMonth, startingOffset } = useMemo(() => {
    const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();
    // Monday is 0, Sunday is 6
    const firstDayIndex = (new Date(currentYear, currentMonth, 1).getDay() + 6) % 7;
    return { daysInMonth: totalDays, startingOffset: firstDayIndex };
  }, [currentYear, currentMonth]);

  const isCurrentMonthOrFuture = useMemo(() => {
    const today = new Date();
    return (
      currentYear > today.getFullYear() ||
      (currentYear === today.getFullYear() && currentMonth > today.getMonth())
    );
  }, [currentYear, currentMonth]);

  const handlePrevMonth = () => {
    if (!isCurrentMonthOrFuture) return;
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const formattedSelectedDate = useMemo(() => {
    if (!value) return "Select date";
    const d = new Date(`${value}T00:00:00`);
    if (isNaN(d.getTime())) return value;
    return d.toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }, [value]);

  return (
    <div className="space-y-3">
      {/* Date display & Quick Presets */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 rounded-xl bg-elevated/70 px-3.5 py-2 text-sm text-foreground">
          <CalendarIcon size={16} className="text-primary shrink-0" />
          <span className="font-medium">{formattedSelectedDate}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              onChange(todayStr);
              const d = new Date(`${todayStr}T00:00:00`);
              setCurrentMonth(d.getMonth());
              setCurrentYear(d.getFullYear());
            }}
            className={cn(
              "rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
              value === todayStr
                ? "bg-primary text-primary-foreground"
                : "bg-elevated text-muted-foreground hover:text-foreground hover:bg-secondary"
            )}
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => {
              onChange(tomorrowStr);
              const d = new Date(`${tomorrowStr}T00:00:00`);
              setCurrentMonth(d.getMonth());
              setCurrentYear(d.getFullYear());
            }}
            className={cn(
              "rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
              value === tomorrowStr
                ? "bg-primary text-primary-foreground"
                : "bg-elevated text-muted-foreground hover:text-foreground hover:bg-secondary"
            )}
          >
            Tomorrow
          </button>
          <button
            type="button"
            onClick={() => {
              onChange(fridayStr);
              const d = new Date(`${fridayStr}T00:00:00`);
              setCurrentMonth(d.getMonth());
              setCurrentYear(d.getFullYear());
            }}
            className={cn(
              "rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
              value === fridayStr
                ? "bg-primary text-primary-foreground"
                : "bg-elevated text-muted-foreground hover:text-foreground hover:bg-secondary"
            )}
          >
            Next Friday
          </button>
        </div>
      </div>

      {/* Calendar Card in System UI Dark Theme */}
      <div className="rounded-xl bg-surface/80 p-3.5 sm:p-4">
        {/* Month Navigation */}
        <div className="flex items-center justify-between pb-3">
          <span className="text-sm font-semibold text-foreground">
            {MONTH_NAMES[currentMonth]} {currentYear}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handlePrevMonth}
              disabled={!isCurrentMonthOrFuture}
              aria-label="Previous month"
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg bg-elevated text-muted-foreground transition-colors",
                !isCurrentMonthOrFuture
                  ? "opacity-30 cursor-not-allowed"
                  : "hover:text-foreground hover:bg-secondary"
              )}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              aria-label="Next month"
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-elevated text-muted-foreground transition-colors hover:text-foreground hover:bg-secondary"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Days of week header */}
        <div className="grid grid-cols-7 gap-1 text-center pb-1.5">
          {DAYS_OF_WEEK.map((d) => (
            <span key={d} className="text-xs font-medium text-muted-foreground/70 py-1">
              {d}
            </span>
          ))}
        </div>

        {/* Day Grid */}
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: startingOffset }).map((_, i) => (
            <div key={`empty-${i}`} className="h-9 w-full" />
          ))}

          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const iso = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(
              dayNum
            ).padStart(2, "0")}`;
            const isPast = iso < minDate;
            const isSelected = iso === value;
            const isToday = iso === todayStr;

            return (
              <button
                type="button"
                key={iso}
                disabled={isPast}
                onClick={() => onChange(iso)}
                className={cn(
                  "flex h-9 w-full items-center justify-center rounded-lg text-xs font-medium transition-all",
                  isPast && "text-muted-foreground/25 cursor-not-allowed",
                  !isPast && !isSelected && "text-foreground hover:bg-elevated hover:text-foreground",
                  isToday && !isSelected && "border border-primary/40 text-primary font-semibold",
                  isSelected && "bg-primary text-primary-foreground font-semibold shadow-sm"
                )}
              >
                {dayNum}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
