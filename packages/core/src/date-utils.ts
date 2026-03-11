const RELATIVE_DATE_RE = /^([+-])(\d+)([dwmy])$/

/**
 * Type guard that checks whether a value is a relative date expression.
 *
 * Relative date expressions follow the pattern `[+-]<amount><unit>` where
 * `unit` is one of `d` (days), `w` (weeks), `m` (months), or `y` (years).
 *
 * @param value - The value to test.
 * @returns `true` if `value` is a string matching the relative date pattern.
 *
 * @example
 * ```ts
 * isRelativeDate("+7d")   // true  (7 days from now)
 * isRelativeDate("-1m")   // true  (1 month ago)
 * isRelativeDate("2024-01-01") // false (absolute date)
 * isRelativeDate(42)      // false (not a string)
 * ```
 */
export const isRelativeDate = (value: unknown): value is string =>
    typeof value === 'string' && RELATIVE_DATE_RE.test(value)

/**
 * Resolves a relative date expression into an absolute ISO-8601 date string.
 *
 * Supported units:
 * - `d` -- days
 * - `w` -- weeks (7 days)
 * - `m` -- months
 * - `y` -- years
 *
 * Arithmetic is performed in UTC. If the input does not match the relative
 * date pattern, it is returned unchanged.
 *
 * @param relative - A relative date expression (e.g. `"+7d"`, `"-3m"`).
 * @param now - Reference date for the calculation. Defaults to `new Date()`.
 * @returns An ISO-8601 date-time string, or the original string if it is not
 *   a valid relative expression.
 *
 * @example
 * ```ts
 * const base = new Date("2024-06-15T00:00:00Z");
 * resolveRelativeDate("+7d", base)  // "2024-06-22T00:00:00.000Z"
 * resolveRelativeDate("-1m", base)  // "2024-05-15T00:00:00.000Z"
 * resolveRelativeDate("+1y", base)  // "2025-06-15T00:00:00.000Z"
 * ```
 */
export const resolveRelativeDate = (relative: string, now: Date = new Date()): string => {
    const match = RELATIVE_DATE_RE.exec(relative)
    if (!match) {
        return relative
    }

    const sign = match[1] === '+' ? 1 : -1
    const amount = Number(match[2]) * sign
    const unit = match[3]

    const result = new Date(now.getTime())

    switch (unit) {
        case 'd':
            result.setUTCDate(result.getUTCDate() + amount)
            break
        case 'w':
            result.setUTCDate(result.getUTCDate() + amount * 7)
            break
        case 'm':
            result.setUTCMonth(result.getUTCMonth() + amount)
            break
        case 'y':
            result.setUTCFullYear(result.getUTCFullYear() + amount)
            break
    }

    return result.toISOString()
}
