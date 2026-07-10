// Resolve wall-clock times in an IANA zone to absolute instants using only
// Intl — no timezone library.

export function isValidTimeZone(tz) {
  if (typeof tz !== 'string' || tz === '') return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

// Offset of `timeZone` from UTC at the given UTC instant, in milliseconds.
function tzOffsetMillis(utcMillis, timeZone) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    })
      .formatToParts(new Date(utcMillis))
      .map((p) => [p.type, p.value]),
  );
  const asUtc = Date.UTC(
    Number(parts.year), Number(parts.month) - 1, Number(parts.day),
    Number(parts.hour) % 24, Number(parts.minute), Number(parts.second),
  );
  return asUtc - utcMillis;
}

// dateStr "YYYY-MM-DD" + timeStr "HH:MM" as a wall clock in timeZone → ISO
// instant string.
export function zonedTimeToInstant(dateStr, timeStr, timeZone) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [hh, mm] = timeStr.split(':').map(Number);
  const wallAsUtc = Date.UTC(y, m - 1, d, hh, mm);
  let guess = wallAsUtc;
  // Two passes: the offset at the first guess can differ from the offset at
  // the true instant right around a DST transition.
  for (let i = 0; i < 2; i++) {
    guess = wallAsUtc - tzOffsetMillis(guess, timeZone);
  }
  return new Date(guess).toISOString();
}
