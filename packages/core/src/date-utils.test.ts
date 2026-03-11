import { isRelativeDate, resolveRelativeDate } from './date-utils'

describe('isRelativeDate', () => {
    it('returns true for valid relative date strings', () => {
        expect(isRelativeDate('+1d')).toBe(true)
        expect(isRelativeDate('-5d')).toBe(true)
        expect(isRelativeDate('+2w')).toBe(true)
        expect(isRelativeDate('-3m')).toBe(true)
        expect(isRelativeDate('+10y')).toBe(true)
    })

    it('returns false for absolute date strings', () => {
        expect(isRelativeDate('2025-01-01T00:00:00.000Z')).toBe(false)
    })

    it('returns false for non-string values', () => {
        expect(isRelativeDate(42)).toBe(false)
        expect(isRelativeDate(null)).toBe(false)
        expect(isRelativeDate(undefined)).toBe(false)
        expect(isRelativeDate(true)).toBe(false)
        expect(isRelativeDate({})).toBe(false)
    })

    it('returns false for malformed relative strings', () => {
        expect(isRelativeDate('1d')).toBe(false)
        expect(isRelativeDate('+d')).toBe(false)
        expect(isRelativeDate('+1x')).toBe(false)
        expect(isRelativeDate('+')).toBe(false)
        expect(isRelativeDate('')).toBe(false)
        expect(isRelativeDate('hello')).toBe(false)
        expect(isRelativeDate('+1dd')).toBe(false)
    })
})

describe('resolveRelativeDate', () => {
    const now = new Date('2025-06-15T12:00:00.000Z')

    describe('days (d)', () => {
        it('adds days with positive offset', () => {
            const result = resolveRelativeDate('+5d', now)
            expect(result).toBe(new Date('2025-06-20T12:00:00.000Z').toISOString())
        })

        it('subtracts days with negative offset', () => {
            const result = resolveRelativeDate('-3d', now)
            expect(result).toBe(new Date('2025-06-12T12:00:00.000Z').toISOString())
        })
    })

    describe('weeks (w)', () => {
        it('adds weeks with positive offset', () => {
            const result = resolveRelativeDate('+2w', now)
            expect(result).toBe(new Date('2025-06-29T12:00:00.000Z').toISOString())
        })

        it('subtracts weeks with negative offset', () => {
            const result = resolveRelativeDate('-1w', now)
            expect(result).toBe(new Date('2025-06-08T12:00:00.000Z').toISOString())
        })
    })

    describe('months (m)', () => {
        it('adds months with positive offset', () => {
            const result = resolveRelativeDate('+3m', now)
            expect(result).toBe(new Date('2025-09-15T12:00:00.000Z').toISOString())
        })

        it('subtracts months with negative offset', () => {
            const result = resolveRelativeDate('-2m', now)
            expect(result).toBe(new Date('2025-04-15T12:00:00.000Z').toISOString())
        })

        it('handles month overflow (Jan 31 + 1m)', () => {
            const jan31 = new Date('2025-01-31T00:00:00.000Z')
            const result = resolveRelativeDate('+1m', jan31)
            // JS Date.setUTCMonth overflow: Jan 31 + 1m = Mar 3 (Feb has 28 days in 2025)
            const parsed = new Date(result)
            expect(parsed.getUTCMonth()).toBe(2) // March (0-indexed)
        })
    })

    describe('years (y)', () => {
        it('adds years with positive offset', () => {
            const result = resolveRelativeDate('+1y', now)
            expect(result).toBe(new Date('2026-06-15T12:00:00.000Z').toISOString())
        })

        it('subtracts years with negative offset', () => {
            const result = resolveRelativeDate('-2y', now)
            expect(result).toBe(new Date('2023-06-15T12:00:00.000Z').toISOString())
        })
    })

    describe('edge cases', () => {
        it('handles leap year (Feb 29 + 1y)', () => {
            const leapDay = new Date('2024-02-29T00:00:00.000Z')
            const result = resolveRelativeDate('+1y', leapDay)
            const parsed = new Date(result)
            // 2025 is not a leap year, Feb 29 + 1y overflows
            expect(parsed.getUTCFullYear()).toBe(2025)
            expect(parsed.getUTCMonth()).toBe(2) // March
            expect(parsed.getUTCDate()).toBe(1)
        })

        it('returns non-matching strings as-is', () => {
            expect(resolveRelativeDate('2025-01-01T00:00:00.000Z', now)).toBe('2025-01-01T00:00:00.000Z')
            expect(resolveRelativeDate('hello', now)).toBe('hello')
            expect(resolveRelativeDate('', now)).toBe('')
        })

        it('handles zero offset', () => {
            const result = resolveRelativeDate('+0d', now)
            expect(result).toBe(now.toISOString())
        })
    })
})
