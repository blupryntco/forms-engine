import { compileSafePattern, isUnsafePattern, maxPatternLength } from './regex-safety'

describe('isUnsafePattern', () => {
    it.each([
        '^(a+)+$',
        '(a*)*',
        '(\\w+\\s?)*',
        '((ab)+c)*',
        '(a{1,5})+',
        '(?:x+y)+',
        '(a+){2,}',
        '(?<word>a+)*',
        '((a+))+',
        '(a+?)+',
    ])('flags %s', (pattern) => {
        expect(isUnsafePattern(pattern)).toBe(true)
    })

    it.each([
        '^[a-z]+$',
        '^[^@]+@[^@]+\\.[^@]+$',
        '(ab)+',
        '[(+)]+',
        '\\(a+\\)+',
        '(a)?',
        'a{2}',
        '^eip155',
        '(a+)?',
        '(a+){1}',
        '(a+)b+',
        '[\\]+]+',
        '(a|b)+',
        'a+|(b)*',
        '{(a)}+',
    ])('accepts %s', (pattern) => {
        expect(isUnsafePattern(pattern)).toBe(false)
    })
})

describe('compileSafePattern', () => {
    it('compiles a safe pattern', () => {
        expect(compileSafePattern('^[a-z]+$')?.test('abc')).toBe(true)
    })

    it('rejects an unsafe pattern', () => {
        expect(compileSafePattern('^(a+)+$')).toBeUndefined()
    })

    it('rejects an invalid pattern', () => {
        expect(compileSafePattern('[invalid(')).toBeUndefined()
    })

    it('rejects a pattern longer than the limit', () => {
        expect(compileSafePattern('a'.repeat(maxPatternLength + 1))).toBeUndefined()
        expect(compileSafePattern('a'.repeat(maxPatternLength))).toBeInstanceOf(RegExp)
    })

    it('returns the cached instance for a repeated pattern', () => {
        expect(compileSafePattern('^cached$')).toBe(compileSafePattern('^cached$'))
    })
})
