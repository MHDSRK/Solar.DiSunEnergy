const DEFAULT_START_MINUTES = 9 * 60
const DEFAULT_END_MINUTES = 18 * 60

export function isValidCalendarDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return false
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
}

function toMinutes(value: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(value)
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 23 || minutes > 59) return null
  return hours * 60 + minutes
}

export function getConfiguredHolidays() {
  return new Set(
    (process.env.SITE_VISIT_HOLIDAYS ?? '')
      .split(',')
      .map((value) => value.trim())
      .filter((value) => /^\d{4}-\d{2}-\d{2}$/.test(value)),
  )
}

export function validateSiteVisitSlot(date: string, time: string, now = new Date()) {
  const errors: string[] = []
  if (!isValidCalendarDate(date)) {
    return ['Please select a valid site visit date.']
  }
  const minutes = toMinutes(time)
  if (minutes === null) return ['Please select a valid site visit time.']

  const indiaNow = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
  const normalizedToday = indiaNow.replace(/\//g, '-')
  if (date < normalizedToday) errors.push('Preferred date cannot be in the past.')

  const currentTime = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false }).format(now)
  const currentParts = currentTime.split(':').map(Number)
  const currentMinutes = currentParts[0] * 60 + currentParts[1]
  if (date === normalizedToday && minutes <= currentMinutes) errors.push('Preferred time must be later than the current time.')

  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short',
  }).format(new Date(`${date}T12:00:00+05:30`))
  if (weekday === 'Sun') errors.push('Site visits are not available on Sundays.')

  if (getConfiguredHolidays().has(date)) errors.push('Site visits are not available on the selected holiday.')

  if (minutes < DEFAULT_START_MINUTES || minutes > DEFAULT_END_MINUTES) {
    errors.push('Appointments are only available between 09:00 and 18:00.')
  }

  return errors
}

export function parseLocation(value: string) {
  const match = /^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/.exec(value)
  if (!match) return { latitude: null, longitude: null }
  const latitude = Number(match[1])
  const longitude = Number(match[2])
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return { latitude: null, longitude: null }
  return { latitude, longitude }
}
