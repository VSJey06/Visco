export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 B'
  }

  if (bytes < 1024) {
    return `${Math.round(bytes)} B`
  }

  const units = ['KB', 'MB', 'GB', 'TB']
  let value = bytes / 1024
  let unitIndex = 0

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }

  const digits = value >= 10 ? 0 : 1
  return `${value.toFixed(digits)} ${units[unitIndex]}`
}

export function formatPageRange(start: number, end: number): string {
  if (start === end) {
    return `p. ${start}`
  }

  return `pp. ${start}–${end}`
}

export function formatPageList(
  pageNumbers: number[],
  limit = 8,
): string {
  if (pageNumbers.length === 0) {
    return ''
  }

  const sorted = [...new Set(pageNumbers)].sort((a, b) => a - b)
  const ranges: Array<[number, number]> = []

  for (const pageNumber of sorted) {
    const previous = ranges[ranges.length - 1]

    if (previous && pageNumber === previous[1] + 1) {
      previous[1] = pageNumber
    } else {
      ranges.push([pageNumber, pageNumber])
    }
  }

  const labels = ranges.map(([start, end]) =>
    start === end ? `${start}` : `${start}–${end}`,
  )

  if (labels.length <= limit) {
    return labels.join(', ')
  }

  return `${labels.slice(0, limit).join(', ')} +${
    labels.length - limit
  } more`
}

export function formatPdfDate(value: string | null): string | null {
  if (!value) {
    return null
  }

  const match =
    /^D:(\d{4})(\d{2})?(\d{2})?(\d{2})?(\d{2})?(\d{2})?/.exec(value)

  if (!match) {
    return value
  }

  const [, year, month, day, hour, minute, second] = match
  const date = new Date(
    Date.UTC(
      Number(year),
      month ? Number(month) - 1 : 0,
      day ? Number(day) : 1,
      hour ? Number(hour) : 0,
      minute ? Number(minute) : 0,
      second ? Number(second) : 0,
    ),
  )

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function getDocumentTitle(
  metadataTitle: string | null,
  fileName: string,
): string {
  if (metadataTitle) {
    return metadataTitle
  }

  return fileName.replace(/\.pdf$/i, '')
}
