
import { parse, isValid, format } from 'date-fns';

// Helper to parse various date strings to a standard "local" format string
export const parseApiDateString = (dateString?: string): string | undefined => {
  if (!dateString) return undefined;

  const tryParseVariousFormats = (dateStr: string): Date | null => {
    const formatsToTry = [
      "yyyy-MM-dd HH:mm:ss.SSSX", // With milliseconds and timezone
      "yyyy-MM-dd HH:mm:ssX",    // With timezone
      "yyyy-MM-dd HH:mm:ss.SSS", // With milliseconds, no Z
      "yyyy-MM-dd HH:mm:ss",   // No milliseconds, no Z
      "yyyy-MM-dd'T'HH:mm:ss.SSSX", // ISO with milliseconds and timezone
      "yyyy-MM-dd'T'HH:mm:ssX",    // ISO with timezone
      "yyyy-MM-dd'T'HH:mm:ss.SSS", // ISO with milliseconds, no Z
      "yyyy-MM-dd'T'HH:mm:ss",   // ISO no Z
      "yyyy-MM-dd",
    ];

    for (const fmt of formatsToTry) {
      try {
        const parsed = parse(dateStr, fmt, new Date());
        if (isValid(parsed)) {
          return parsed;
        }
      } catch { /* Ignore and try next format */ }
    }
    // Fallback to native Date parsing if no format matches
    try {
      const nativeParsed = new Date(dateStr);
      if (isValid(nativeParsed)) {
        return nativeParsed;
      }
    } catch { /* Ignore native parse error */ }
    
    console.warn(`Could not parse date string: "${dateStr}" with any known format or native Date. Returning null.`);
    return null;
  };

  const parsedDateObject = tryParseVariousFormats(dateString);

  if (parsedDateObject) {
    // Re-format the date into a standard 'local time' format string.
    // This avoids using .toISOString(), which would convert the time to UTC.
    // A string like "2025-08-02 19:00:00" passed to `new Date()` on the client
    // will be interpreted in the browser's local timezone, effectively showing
    // the time as it was written, without conversion.
    return format(parsedDateObject, "yyyy-MM-dd HH:mm:ss");
  }
  
  console.warn(`parseApiDateString: Failed to parse "${dateString}" into a valid string. Returning original or undefined.`);
  // Return the original string if parsing fails, so we don't lose data.
  return dateString;
};

// Helper for unique IDs for mock data
export const generateId = (prefix: string = 'id') => `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    