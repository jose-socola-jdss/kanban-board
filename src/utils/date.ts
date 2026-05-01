import type { BusinessDayAdjustment, Holiday, Task } from '../types'

const MS_PER_DAY = 86_400_000

function startOfDay(date: Date): Date {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return startOfDay(next)
}

function addYears(date: Date, years: number): Date {
  return startOfDay(new Date(date.getFullYear() + years, date.getMonth(), date.getDate()))
}

function parseDateString(value: string): Date {
  const [year, month, day] = value.split('-').map(Number)
  return startOfDay(new Date(year, (month || 1) - 1, day || 1))
}

export function toDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function daysBetween(a: Date, b: Date): number {
  return Math.floor((startOfDay(a).getTime() - startOfDay(b).getTime()) / MS_PER_DAY)
}

function lastDayOfMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate()
}

function clampMonthDay(year: number, monthIndex: number, day: number): Date {
  const safeDay = Math.min(Math.max(day, 1), lastDayOfMonth(year, monthIndex))
  return startOfDay(new Date(year, monthIndex, safeDay))
}

function addMonthsClamped(date: Date, months: number): Date {
  const targetMonth = date.getMonth() + months
  return clampMonthDay(date.getFullYear(), targetMonth, date.getDate())
}

function getNthWeekdayOfMonth(year: number, monthIndex: number, weekday: number, ordinal: number): Date | null {
  const firstDay = new Date(year, monthIndex, 1)
  const offset = (weekday - firstDay.getDay() + 7) % 7
  const day = 1 + offset + (ordinal - 1) * 7
  if (day > lastDayOfMonth(year, monthIndex)) return null
  return startOfDay(new Date(year, monthIndex, day))
}

function getLastWeekdayOfMonth(year: number, monthIndex: number, weekday: number): Date {
  const lastDay = new Date(year, monthIndex + 1, 0)
  const offset = (lastDay.getDay() - weekday + 7) % 7
  return startOfDay(new Date(year, monthIndex, lastDay.getDate() - offset))
}

function isWeekend(date: Date): boolean {
  const day = date.getDay()
  return day === 0
}

function isHoliday(date: Date, holidays: Holiday[]): boolean {
  const dateStr = toDateKey(date)
  return holidays.some((holiday) => holiday.date === dateStr)
}

export function adjustToBusinessDay(
  date: Date,
  adjustment: BusinessDayAdjustment = 'none',
  holidays: Holiday[] = [],
): Date {
  if (adjustment === 'none') return startOfDay(date)
  const delta = adjustment === 'previous' ? -1 : 1
  let current = startOfDay(date)
  while (isWeekend(current) || isHoliday(current, holidays)) {
    current = addDays(current, delta)
  }
  return current
}

export function getTodayString(): string {
  return toDateKey(new Date())
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

function getRecurrenceAnchor(task: Task): Date {
  if (task.dueDate) return parseDateString(task.dueDate)
  if (task.createdAt) return parseDateString(task.createdAt.slice(0, 10))
  return startOfDay(new Date())
}

function getRecurrenceInterval(task: Task): number {
  return Math.max(1, task.recurrenceInterval ?? 1)
}

function getRecurrenceAdjustment(task: Task): BusinessDayAdjustment {
  return task.recurrenceBusinessDayAdjustment ?? 'none'
}

function getRecurrenceEnd(task: Task): Date | null {
  return task.recurringEndDate ? parseDateString(task.recurringEndDate) : null
}

function pushRecurringOccurrence(
  dates: Date[],
  task: Task,
  candidate: Date | null,
  rangeStart: Date,
  rangeEnd: Date,
  holidays: Holiday[],
) {
  if (!candidate) return
  const adjusted = adjustToBusinessDay(candidate, getRecurrenceAdjustment(task), holidays)
  const end = getRecurrenceEnd(task)
  if (end && adjusted > end) return
  if (adjusted < rangeStart || adjusted > rangeEnd) return
  dates.push(adjusted)
}

export function getOccurrencesInRange(
  task: Task,
  startDate: Date,
  endDate: Date,
  holidays: Holiday[] = [],
  maxOccurrences = 128,
): Date[] {
  if (task.schedulingType !== 'recurring') return []

  const start = startOfDay(startDate)
  const end = startOfDay(endDate)
  const anchor = getRecurrenceAnchor(task)
  const results: Date[] = []

  if (end < start) return results

  const push = (candidate: Date | null) => {
    if (results.length >= maxOccurrences) return
    pushRecurringOccurrence(results, task, candidate, start, end, holidays)
  }

  if (task.recurringType === 'daily') {
    let current = anchor > start ? anchor : start
    while (current <= end && results.length < maxOccurrences) {
      push(current)
      current = addDays(current, 1)
    }
    return results.sort((a, b) => a.getTime() - b.getTime())
  }

  if (task.recurringType === 'weekly' && task.recurringWeekDay !== undefined) {
    let current = anchor
    const offset = (task.recurringWeekDay - current.getDay() + 7) % 7
    current = addDays(current, offset)
    if (current < anchor) current = addDays(current, 7)
    while (current < start) current = addDays(current, 7)
    while (current <= end && results.length < maxOccurrences) {
      push(current)
      current = addDays(current, 7)
    }
    return results.sort((a, b) => a.getTime() - b.getTime())
  }

  if (task.recurringType === 'monthly' && task.recurringMonthDay !== undefined) {
    let current = new Date(anchor.getFullYear(), anchor.getMonth(), 1)
    while (current <= end && results.length < maxOccurrences) {
      const candidate = clampMonthDay(current.getFullYear(), current.getMonth(), task.recurringMonthDay)
      if (candidate >= anchor) push(candidate)
      current = new Date(current.getFullYear(), current.getMonth() + 1, 1)
    }
    return results.sort((a, b) => a.getTime() - b.getTime())
  }

  if (task.recurringType === 'yearly') {
    const month = (task.recurrenceMonth ?? anchor.getMonth() + 1) - 1
    const day = task.recurringMonthDay ?? anchor.getDate()
    for (let year = start.getFullYear() - 1; year <= end.getFullYear() + 1 && results.length < maxOccurrences; year++) {
      const candidate = clampMonthDay(year, month, day)
      if (candidate >= anchor) push(candidate)
    }
    return results.sort((a, b) => a.getTime() - b.getTime())
  }

  if (task.recurringType === 'monthlyFirstDay') {
    for (let year = start.getFullYear() - 1; year <= end.getFullYear() + 1 && results.length < maxOccurrences; year++) {
      for (let month = 0; month < 12 && results.length < maxOccurrences; month++) {
        const candidate = new Date(year, month, 1)
        if (candidate >= anchor) push(candidate)
      }
    }
    return results.sort((a, b) => a.getTime() - b.getTime())
  }

  if (task.recurringType === 'monthlyLastDay') {
    for (let year = start.getFullYear() - 1; year <= end.getFullYear() + 1 && results.length < maxOccurrences; year++) {
      for (let month = 0; month < 12 && results.length < maxOccurrences; month++) {
        const candidate = new Date(year, month + 1, 0)
        if (candidate >= anchor) push(candidate)
      }
    }
    return results.sort((a, b) => a.getTime() - b.getTime())
  }

  if (task.recurringType === 'monthlyNthWeekday' && task.recurringWeekDay !== undefined) {
    const ordinal = Math.max(1, task.recurrenceOrdinal ?? 1)
    for (let year = start.getFullYear() - 1; year <= end.getFullYear() + 1 && results.length < maxOccurrences; year++) {
      for (let month = 0; month < 12 && results.length < maxOccurrences; month++) {
        const candidate = getNthWeekdayOfMonth(year, month, task.recurringWeekDay, ordinal)
        if (candidate && candidate >= anchor) push(candidate)
      }
    }
    return results.sort((a, b) => a.getTime() - b.getTime())
  }

  if (task.recurringType === 'monthlyLastWeekday' && task.recurringWeekDay !== undefined) {
    for (let year = start.getFullYear() - 1; year <= end.getFullYear() + 1 && results.length < maxOccurrences; year++) {
      for (let month = 0; month < 12 && results.length < maxOccurrences; month++) {
        const candidate = getLastWeekdayOfMonth(year, month, task.recurringWeekDay)
        if (candidate >= anchor) push(candidate)
      }
    }
    return results.sort((a, b) => a.getTime() - b.getTime())
  }

  if (task.recurringType === 'intervalDays') {
    const interval = getRecurrenceInterval(task)
    const diff = Math.max(0, daysBetween(start, anchor))
    const initialStep = Math.floor(diff / interval)
    let current = addDays(anchor, initialStep * interval)
    while (current < start) current = addDays(current, interval)
    while (current <= end && results.length < maxOccurrences) {
      push(current)
      current = addDays(current, interval)
    }
    return results.sort((a, b) => a.getTime() - b.getTime())
  }

  if (task.recurringType === 'intervalWeeks') {
    const interval = getRecurrenceInterval(task) * 7
    const diff = Math.max(0, daysBetween(start, anchor))
    const initialStep = Math.floor(diff / interval)
    let current = addDays(anchor, initialStep * interval)
    while (current < start) current = addDays(current, interval)
    while (current <= end && results.length < maxOccurrences) {
      push(current)
      current = addDays(current, interval)
    }
    return results.sort((a, b) => a.getTime() - b.getTime())
  }

  if (task.recurringType === 'intervalMonths') {
    const interval = getRecurrenceInterval(task)
    let current = anchor
    while (current < start) current = addMonthsClamped(current, interval)
    while (current <= end && results.length < maxOccurrences) {
      push(current)
      current = addMonthsClamped(current, interval)
    }
    return results.sort((a, b) => a.getTime() - b.getTime())
  }

  return results.sort((a, b) => a.getTime() - b.getTime())
}

export function getNextOccurrence(
  task: Task,
  holidays: Holiday[] = [],
  fromDate: Date = new Date(),
): Date | null {
  const start = startOfDay(fromDate)
  const searchStart = addDays(start, -31)
  const searchEnd = addYears(start, 5)
  const occurrences = getOccurrencesInRange(task, searchStart, searchEnd, holidays, 512)
  return occurrences.find((occurrence) => occurrence >= start) ?? null
}

export function getEffectiveDueDate(task: Task, holidays: Holiday[] = [], fromDate: Date = new Date()): string | undefined {
  if (task.schedulingType === 'recurring') {
    const next = getNextOccurrence(task, holidays, fromDate)
    return next ? toDateKey(next) : undefined
  }
  return task.dueDate
}

export function isTaskDueOnDate(task: Task, date: Date, holidays: Holiday[] = []): boolean {
  const normalized = startOfDay(date)
  if (task.schedulingType === 'recurring') {
    return getOccurrencesInRange(task, normalized, normalized, holidays).length > 0
  }
  if (!task.dueDate) return false
  return task.dueDate === toDateKey(normalized)
}

export function shouldResetRecurringTask(task: Task, holidays: Holiday[] = [], today = new Date()): boolean {
  if (task.schedulingType !== 'recurring' || task.column !== 'completed' || !task.completedAt) return false
  const completionDate = parseDateString(task.completedAt.slice(0, 10))
  const nextOccurrence = getNextOccurrence(task, holidays, addDays(completionDate, 1))
  return !!nextOccurrence && nextOccurrence <= startOfDay(today)
}

export function getTaskDateForSorting(task: Task, holidays: Holiday[] = [], fromDate: Date = new Date()): string | undefined {
  return getEffectiveDueDate(task, holidays, fromDate)
}

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
  const due = parseDateString(dueDate)
  return due >= start && due <= end
}

/** Formats a Date as "25 abr" */
export function formatShortDate(date: Date): string {
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
}
