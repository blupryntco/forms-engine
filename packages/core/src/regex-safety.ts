/** Longest `pattern` a definition may carry; the JSON schema enforces the same limit. */
export const maxPatternLength = 1000

/** Compiled patterns cached by source; cleared when full so untrusted input cannot grow it unbounded. */
const maxCachedPatterns = 256

/** `{n}`, `{n,}` or `{n,m}` at the start of the input. */
const BRACE_QUANTIFIER_RE = /^\{(\d+)(,(\d*))?\}/

/** Cache of {@link compileSafePattern} results; `undefined` marks a rejected pattern. */
const compiledPatterns = new Map<string, RegExp | undefined>()

/** What a quantifier found at the current position would repeat. */
type LastAtom = 'none' | 'plain' | 'group' | 'repeated-group'

/** A quantifier read from the pattern: where it ends and whether it repeats its atom more than once. */
type Quantifier = { end: number; isRepeating: boolean }

/**
 * Whether `pattern` nests a repeating quantifier inside a repeated group (star height above 1),
 * the shape behind catastrophic backtracking such as `^(a+)+$`. Overlapping alternations are not detected.
 */
export const isUnsafePattern = (pattern: string): boolean => {
    // One flag per open group, plus the top level: does it contain a repeating quantifier?
    const groups: boolean[] = [false]
    let lastAtom: LastAtom = 'none'
    let i = 0

    while (i < pattern.length) {
        const char = pattern[i]
        const quantifier = readQuantifier(pattern, i)

        if (quantifier && lastAtom !== 'none') {
            if (quantifier.isRepeating) {
                if (lastAtom === 'repeated-group') return true
                groups[groups.length - 1] = true
            }
            lastAtom = 'none'
            i = quantifier.end
        } else if (char === '\\') {
            lastAtom = 'plain'
            i += 2
        } else if (char === '[') {
            lastAtom = 'plain'
            i = skipCharacterClass(pattern, i)
        } else if (char === '(') {
            groups.push(false)
            lastAtom = 'none'
            i = skipGroupPrefix(pattern, i + 1)
        } else if (char === ')' && groups.length > 1) {
            const hasQuantifier = groups.pop() === true
            if (hasQuantifier) groups[groups.length - 1] = true
            lastAtom = hasQuantifier ? 'repeated-group' : 'group'
            i++
        } else {
            lastAtom = char === '|' ? 'none' : 'plain'
            i++
        }
    }

    return false
}

/**
 * Compiles `pattern` unless it is longer than {@link maxPatternLength}, invalid or unsafe per
 * {@link isUnsafePattern}; returns `undefined` then. Results are cached by pattern source.
 */
export const compileSafePattern = (pattern: string): RegExp | undefined => {
    if (compiledPatterns.has(pattern)) return compiledPatterns.get(pattern)

    const compiled = compilePattern(pattern)
    if (compiledPatterns.size >= maxCachedPatterns) compiledPatterns.clear()
    compiledPatterns.set(pattern, compiled)
    return compiled
}

/** Uncached body of {@link compileSafePattern}. */
const compilePattern = (pattern: string): RegExp | undefined => {
    if (pattern.length > maxPatternLength) return undefined

    let re: RegExp
    try {
        re = new RegExp(pattern)
    } catch {
        return undefined
    }
    return isUnsafePattern(pattern) ? undefined : re
}

/** Reads a quantifier (`*`, `+`, `?`, `{n,m}`, with an optional lazy `?`) at `start`, if there is one. */
const readQuantifier = (pattern: string, start: number): Quantifier | undefined => {
    const char = pattern[start]
    let end: number
    let isRepeating: boolean

    if (char === '*' || char === '+' || char === '?') {
        end = start + 1
        isRepeating = char !== '?'
    } else if (char === '{') {
        const match = BRACE_QUANTIFIER_RE.exec(pattern.slice(start))
        if (!match) return undefined
        end = start + match[0].length
        isRepeating = getBraceUpperBound(match) > 1
    } else {
        return undefined
    }

    if (pattern[end] === '?') end++
    return { end, isRepeating }
}

/** Upper bound of a matched `{n}`, `{n,}` or `{n,m}`; `Infinity` when open-ended. */
const getBraceUpperBound = (match: RegExpExecArray): number => {
    if (match[2] === undefined) return Number(match[1])
    return match[3] === '' || match[3] === undefined ? Number.POSITIVE_INFINITY : Number(match[3])
}

/** Index just past the character class opening at `start`, honouring escapes inside it. */
const skipCharacterClass = (pattern: string, start: number): number => {
    let i = start + 1
    while (i < pattern.length && pattern[i] !== ']') {
        i += pattern[i] === '\\' ? 2 : 1
    }
    return i + 1
}

/** Index just past a group's `?:`, `?=`, `?!`, `?<=`, `?<!` or `?<name>` prefix starting at `start`. */
const skipGroupPrefix = (pattern: string, start: number): number => {
    if (pattern[start] !== '?') return start

    const next = pattern[start + 1]
    if (next === ':' || next === '=' || next === '!') return start + 2
    if (next !== '<') return start + 1

    const afterAngle = pattern[start + 2]
    if (afterAngle === '=' || afterAngle === '!') return start + 3

    const close = pattern.indexOf('>', start + 2)
    return close === -1 ? pattern.length : close + 1
}
