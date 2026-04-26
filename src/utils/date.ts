/** Returns the start (today at 00:00) and end (today+6 at 23:59) of the 7-day sliding window. */
export function get7DayWindow(): { start: Date; end: Date } {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

/** Returns true if a task should be visible in the 7-day window.
 *  Tasks without a due date are always shown. */
export function isInWeekWindow(dueDate: string | undefined): boolean {
  if (!dueDate) return true
  const { start, end } = get7DayWindow()
  const due = new Date(dueDate + 'T00:00:00')
  return due >= start && due <= end
}

/** Formats a Date as "25 abr" */
export function formatShortDate(date: Date): string {
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
}

export function getCurrentMonthKey(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

export function formatMonthLabel(monthKey: string, locale = 'es-ES') {
  const [year, month] = monthKey.split('-').map(Number)

  if (!year || !month) {
    return monthKey
  }

  return new Date(year, month - 1, 1).toLocaleDateString(locale, {
    month: 'long',
    year: 'numeric',
  })
}

export function getAdjacentMonthKey(monthKey: string, delta: number): string {
  const [year, month] = monthKey.split('-').map(Number)
  const date = new Date(year, month - 1 + delta, 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}
