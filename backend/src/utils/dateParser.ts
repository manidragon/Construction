export interface ExtractedDateResult {
  date: Date;
  targetUtcDate: Date;
  windowStart: Date;
  windowEnd: Date;
  dateIso: string;
  dateFormatted: string;
  dayRelativeLabel: string;
  isExplicitDate: boolean;
  isFuture: boolean;
  isToday: boolean;
  isYesterday: boolean;
  isTomorrow: boolean;
  dayDiff: number;
}

const MONTH_MAP: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};

const WEEKDAY_MAP: Record<string, number> = {
  sunday: 0,
  sun: 0,
  monday: 1,
  mon: 1,
  tuesday: 2,
  tue: 2,
  wednesday: 3,
  wed: 3,
  thursday: 4,
  thu: 4,
  friday: 5,
  fri: 5,
  saturday: 6,
  sat: 6,
};

/**
 * Extracts date information from natural language text prompts.
 * Supports:
 * - Explicit formats: DD-MM-YYYY, DD/MM/YYYY, DD.MM.YYYY, YYYY-MM-DD, DD-MM-YY
 * - Text formats: "26th Oct 2026", "26 October", "October 26, 2026", "Oct 26"
 * - Relative phrases: "today", "tomorrow", "day after tomorrow", "yesterday", "day before yesterday"
 * - Weekday phrases: "on monday", "next tuesday", "this friday"
 */
export function extractDateFromPrompt(text: string, baseDate: Date = new Date()): ExtractedDateResult {
  const lower = text.toLowerCase();

  const refYear = baseDate.getFullYear();
  const refMonth = baseDate.getMonth(); // 0-indexed (0 to 11)
  const refDay = baseDate.getDate();

  let targetYear = refYear;
  let targetMonth = refMonth;
  let targetDay = refDay;
  let isExplicitDate = false;

  // 1. Check relative keywords first
  if (lower.includes('day after tomorrow')) {
    const d = new Date(refYear, refMonth, refDay + 2);
    targetYear = d.getFullYear();
    targetMonth = d.getMonth();
    targetDay = d.getDate();
    isExplicitDate = true;
  } else if (lower.includes('day before yesterday')) {
    const d = new Date(refYear, refMonth, refDay - 2);
    targetYear = d.getFullYear();
    targetMonth = d.getMonth();
    targetDay = d.getDate();
    isExplicitDate = true;
  } else if (lower.includes('tomorrow')) {
    const d = new Date(refYear, refMonth, refDay + 1);
    targetYear = d.getFullYear();
    targetMonth = d.getMonth();
    targetDay = d.getDate();
    isExplicitDate = true;
  } else if (lower.includes('yesterday')) {
    const d = new Date(refYear, refMonth, refDay - 1);
    targetYear = d.getFullYear();
    targetMonth = d.getMonth();
    targetDay = d.getDate();
    isExplicitDate = true;
  } else if (lower.includes('today') || lower.includes('tonight')) {
    isExplicitDate = true;
  }

  // 2. Numeric date patterns:
  // Pattern A: YYYY-MM-DD or YYYY/MM/DD
  if (!isExplicitDate) {
    const isoMatch = lower.match(/\b(20\d\d)[-/.](0?[1-9]|1[0-2])[-/.](0?[1-9]|[12]\d|3[01])\b/);
    if (isoMatch) {
      targetYear = parseInt(isoMatch[1], 10);
      targetMonth = parseInt(isoMatch[2], 10) - 1;
      targetDay = parseInt(isoMatch[3], 10);
      isExplicitDate = true;
    }
  }

  // Pattern B: DD-MM-YYYY or DD/MM/YYYY or DD.MM.YYYY
  if (!isExplicitDate) {
    const dmyMatch = lower.match(/\b(0?[1-9]|[12]\d|3[01])[-/.](0?[1-9]|1[0-2])[-/.](20\d\d)\b/);
    if (dmyMatch) {
      targetDay = parseInt(dmyMatch[1], 10);
      targetMonth = parseInt(dmyMatch[2], 10) - 1;
      targetYear = parseInt(dmyMatch[3], 10);
      isExplicitDate = true;
    }
  }

  // Pattern C: DD-MM-YY or DD/MM/YY (2-digit year)
  if (!isExplicitDate) {
    const dmyShortMatch = lower.match(/\b(0?[1-9]|[12]\d|3[01])[-/.](0?[1-9]|1[0-2])[-/.](2[0-9]|3[0-9])\b/);
    if (dmyShortMatch) {
      targetDay = parseInt(dmyShortMatch[1], 10);
      targetMonth = parseInt(dmyShortMatch[2], 10) - 1;
      targetYear = 2000 + parseInt(dmyShortMatch[3], 10);
      isExplicitDate = true;
    }
  }

  // 3. Text month patterns:
  // "26th Oct 2026", "26 October 2026", "26 Oct", "26th of October"
  if (!isExplicitDate) {
    const textMonthRegex1 = /\b(0?[1-9]|[12]\d|3[01])(?:st|nd|rd|th)?(?:\s+of)?\s+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)(?:\s+(20\d\d))?\b/;
    const tmMatch1 = lower.match(textMonthRegex1);
    if (tmMatch1) {
      targetDay = parseInt(tmMatch1[1], 10);
      const mName = tmMatch1[2].slice(0, 3);
      targetMonth = MONTH_MAP[mName] - 1;
      targetYear = tmMatch1[3] ? parseInt(tmMatch1[3], 10) : refYear;
      isExplicitDate = true;
    }
  }

  // "Oct 26, 2026", "October 26th 2026", "October 26"
  if (!isExplicitDate) {
    const textMonthRegex2 = /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(0?[1-9]|[12]\d|3[01])(?:st|nd|rd|th)?(?:,?\s+(20\d\d))?\b/;
    const tmMatch2 = lower.match(textMonthRegex2);
    if (tmMatch2) {
      const mName = tmMatch2[1].slice(0, 3);
      targetMonth = MONTH_MAP[mName] - 1;
      targetDay = parseInt(tmMatch2[2], 10);
      targetYear = tmMatch2[3] ? parseInt(tmMatch2[3], 10) : refYear;
      isExplicitDate = true;
    }
  }

  // 4. Weekday expressions: e.g. "on monday", "next tuesday", "this friday"
  if (!isExplicitDate) {
    const weekdayRegex = /\b(?:on|next|coming|this)?\s*(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/;
    const wkMatch = lower.match(weekdayRegex);
    if (
      wkMatch &&
      (lower.includes('absent') ||
        lower.includes('leave') ||
        lower.includes('working') ||
        lower.includes('attendance') ||
        lower.includes('muster'))
    ) {
      const targetWkDay = WEEKDAY_MAP[wkMatch[1]];
      const currentWkDay = baseDate.getDay();
      let diff = targetWkDay - currentWkDay;
      if (diff <= 0) diff += 7; // next occurrence
      if (lower.includes('next ' + wkMatch[1]) && diff < 7) diff += 7;
      const d = new Date(refYear, refMonth, refDay + diff);
      targetYear = d.getFullYear();
      targetMonth = d.getMonth();
      targetDay = d.getDate();
      isExplicitDate = true;
    }
  }

  // Build normalized Date objects
  const mPadded = String(targetMonth + 1).padStart(2, '0');
  const dPadded = String(targetDay).padStart(2, '0');
  const dateIso = `${targetYear}-${mPadded}-${dPadded}`;
  const targetUtcDate = new Date(`${dateIso}T00:00:00.000Z`);

  // Window for database querying (covers local timezone variations)
  const windowStart = new Date(targetUtcDate.getTime() - 14 * 3600 * 1000);
  const windowEnd = new Date(targetUtcDate.getTime() + 14 * 3600 * 1000);

  const dateFormatted = targetUtcDate.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const refIso = `${refYear}-${String(refMonth + 1).padStart(2, '0')}-${String(refDay).padStart(2, '0')}`;
  const isToday = dateIso === refIso;
  const isFuture = dateIso > refIso;

  const refMidnight = new Date(Date.UTC(refYear, refMonth, refDay));
  const dayDiff = Math.round((targetUtcDate.getTime() - refMidnight.getTime()) / (24 * 3600 * 1000));

  const isYesterday = dayDiff === -1;
  const isTomorrow = dayDiff === 1;

  let dayRelativeLabel = '*(Today)*';
  if (isTomorrow) {
    dayRelativeLabel = '*(Tomorrow)*';
  } else if (isYesterday) {
    dayRelativeLabel = '*(Yesterday)*';
  } else if (dayDiff === 2) {
    dayRelativeLabel = '*(Day After Tomorrow)*';
  } else if (dayDiff > 2) {
    dayRelativeLabel = `*(Scheduled — ${dayDiff} days ahead)*`;
  } else if (dayDiff < -1) {
    dayRelativeLabel = `*(${Math.abs(dayDiff)} days ago)*`;
  }

  return {
    date: new Date(targetYear, targetMonth, targetDay),
    targetUtcDate,
    windowStart,
    windowEnd,
    dateIso,
    dateFormatted,
    dayRelativeLabel,
    isExplicitDate,
    isFuture,
    isToday,
    isYesterday,
    isTomorrow,
    dayDiff,
  };
}
