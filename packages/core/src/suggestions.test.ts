import { applySuggestion, getSuggestion, getSuggestions, removeSuggestion, setSuggestion } from './suggestions'
import type { FormDocument, FormValues } from './types/form-values'
import type { FormSuggestions } from './types/suggestion'

// ── Helpers ──

const SUBMITTED_AT = '2025-06-15T00:00:00.000Z'

const doc = (values: FormValues = {}, suggestions?: FormSuggestions): FormDocument => ({
    form: { id: 'test-form', version: '1.0.0', submittedAt: SUBMITTED_AT },
    values,
    ...(suggestions ? { suggestions } : {}),
})

const suggestion = (value: unknown, confidence = 0.5, source = 'extracted from page 1') => ({
    value,
    confidence,
    source,
})

describe('suggestion helpers', () => {
    describe('getSuggestion', () => {
        it('returns the suggestion for a field', () => {
            const d = doc({}, { '1': suggestion('Acme Ltd') })
            expect(getSuggestion(d, 1)).toEqual(suggestion('Acme Ltd'))
        })

        it('returns undefined when the field has no suggestion', () => {
            expect(getSuggestion(doc({}, { '1': suggestion('Acme Ltd') }), 2)).toBeUndefined()
        })

        it('returns undefined on a legacy document without a suggestions key', () => {
            expect(getSuggestion(doc({ '1': 'typed' }), 1)).toBeUndefined()
        })
    })

    describe('getSuggestions', () => {
        it('returns an empty object for a legacy document', () => {
            expect(getSuggestions(doc())).toEqual({})
        })

        it('returns a copy, not the stored map', () => {
            const d = doc({}, { '1': suggestion('Acme Ltd') })
            const result = getSuggestions(d)
            delete result['1']
            expect(getSuggestion(d, 1)).toBeDefined()
        })
    })

    describe('setSuggestion', () => {
        it('adds a suggestion to a legacy document', () => {
            const result = setSuggestion(doc({ '1': 'typed' }), 1, suggestion('Acme Ltd'))
            expect(result.suggestions).toEqual({ '1': suggestion('Acme Ltd') })
            expect(result.values).toEqual({ '1': 'typed' })
        })

        it('does not mutate the input document', () => {
            const original = doc()
            setSuggestion(original, 1, suggestion('Acme Ltd'))
            expect(original.suggestions).toBeUndefined()
        })

        it('replaces an existing suggestion for the same field', () => {
            const d = doc({}, { '1': suggestion('Old') })
            expect(setSuggestion(d, 1, suggestion('New')).suggestions).toEqual({ '1': suggestion('New') })
        })

        it('keeps suggestions for other fields', () => {
            const d = doc({}, { '1': suggestion('Acme Ltd') })
            expect(Object.keys(setSuggestion(d, 2, suggestion(42)).suggestions ?? {})).toEqual(['1', '2'])
        })

        it.each([-0.1, 1.1, Number.NaN, Number.POSITIVE_INFINITY])('rejects confidence %p', (confidence) => {
            expect(() => setSuggestion(doc(), 1, suggestion('Acme Ltd', confidence))).toThrow(
                /confidence must be a number between 0 and 1/,
            )
        })

        it.each([0, 0.3, 1])('accepts confidence %p', (confidence) => {
            expect(() => setSuggestion(doc(), 1, suggestion('Acme Ltd', confidence))).not.toThrow()
        })

        it('deep-copies the stored suggestion value', () => {
            const value = ['a']
            const result = setSuggestion(doc(), 1, suggestion(value))
            value.push('b')
            expect(getSuggestion(result, 1)?.value).toEqual(['a'])
        })
    })

    describe('removeSuggestion', () => {
        it('drops the suggestions key entirely when the last entry goes', () => {
            const result = removeSuggestion(doc({ '1': 'typed' }, { '1': suggestion('Acme Ltd') }), 1)
            expect('suggestions' in result).toBe(false)
            expect(result.values).toEqual({ '1': 'typed' })
        })

        it('keeps remaining suggestions', () => {
            const d = doc({}, { '1': suggestion('Acme Ltd'), '2': suggestion(42) })
            expect(removeSuggestion(d, 1).suggestions).toEqual({ '2': suggestion(42) })
        })

        it('returns the same document when there is nothing to remove', () => {
            const d = doc({ '1': 'typed' })
            expect(removeSuggestion(d, 1)).toBe(d)
        })

        it('does not mutate the input document', () => {
            const original = doc({}, { '1': suggestion('Acme Ltd') })
            removeSuggestion(original, 1)
            expect(original.suggestions).toEqual({ '1': suggestion('Acme Ltd') })
        })
    })

    describe('applySuggestion', () => {
        it('copies the suggested value into values and keeps the suggestion', () => {
            const result = applySuggestion(doc({}, { '1': suggestion('Acme Ltd') }), 1)
            expect(result.values['1']).toBe('Acme Ltd')
            expect(result.suggestions).toEqual({ '1': suggestion('Acme Ltd') })
        })

        it('overwrites an existing value', () => {
            const result = applySuggestion(doc({ '1': 'typed' }, { '1': suggestion('Acme Ltd') }), 1)
            expect(result.values['1']).toBe('Acme Ltd')
        })

        it('returns the same document when the field has no suggestion', () => {
            const d = doc({ '1': 'typed' })
            expect(applySuggestion(d, 1)).toBe(d)
        })

        it('does not alias an array value to the suggestion', () => {
            const result = applySuggestion(doc({}, { '1': suggestion(['a', 'b']) }), 1)
            ;(result.values['1'] as string[]).push('c')
            expect(getSuggestion(result, 1)?.value).toEqual(['a', 'b'])
        })

        it('does not alias an object value to the suggestion', () => {
            const result = applySuggestion(doc({}, { '1': suggestion({ name: 'doc.pdf' }) }), 1)
            ;(result.values['1'] as { name: string }).name = 'tampered.pdf'
            expect(getSuggestion(result, 1)?.value).toEqual({ name: 'doc.pdf' })
        })

        it('does not mutate the input document', () => {
            const original = doc({}, { '1': suggestion('Acme Ltd') })
            applySuggestion(original, 1)
            expect(original.values).toEqual({})
        })
    })
})
