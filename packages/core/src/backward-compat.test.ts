/**
 * Backward compatibility: form definitions and documents authored against
 * `@bluprynt/forms-core@4.0.1` must keep behaving exactly as they did.
 *
 * Baseline: 4.0.1 == `main` @ 9c4b02d. The fixtures in `__fixtures__/backward_compatibility`
 * are frozen -- see the header there. If an assertion in this file fails, the
 * engine's behaviour for legacy data changed. That is either a regression to
 * fix, or an intended break that needs a major version bump; it is never a
 * reason to edit a fixture or relax an expectation.
 */

import { LEGACY_CORPUS, LEGACY_SAMPLES, MATRIX } from './__fixtures__/backward_compatibility'
import { FormEngine } from './form-engine'
import type { FieldValidationError, FieldValidationRule } from './types/validation-results'

/** The 13 rule codes that existed in 4.0.1. Legacy data must never produce anything else. */
const LEGACY_RULE_CODES: FieldValidationRule[] = [
    'REQUIRED',
    'TYPE',
    'MIN_LENGTH',
    'MAX_LENGTH',
    'PATTERN',
    'MIN',
    'MAX',
    'MIN_DATE',
    'MAX_DATE',
    'INVALID_DATE',
    'INVALID_OPTION',
    'MIN_ITEMS',
    'MAX_ITEMS',
]

const flatten = (fieldErrors: Map<number, FieldValidationError[]>) =>
    [...fieldErrors]
        .sort((a, b) => a[0] - b[0])
        .flatMap(([, errors]) => errors)
        .map(({ fieldId, rule, params, itemIndex, itemFieldId }) => ({
            fieldId,
            rule,
            params,
            itemIndex,
            itemFieldId,
        }))

const hiddenIds = (engine: FormEngine, doc: Parameters<FormEngine['getVisibilityMap']>[0]) =>
    [...engine.getVisibilityMap(doc)]
        .filter(([, visible]) => !visible)
        .map(([id]) => id)
        .sort((a, b) => a - b)

describe('backward compatibility -- the 4.0.1 coverage matrix', () => {
    const engine = new FormEngine(MATRIX.definition)

    it('compiles a definition that uses every 4.0.1 feature', () => {
        expect(engine.contentOrder).toHaveLength(88)
    })

    it('resolves every condition operator with 4.0.1 scalar semantics', () => {
        // Derived by hand from matrix.definition.json + matrix.valid.document.json.
        // ids 221-230 are the false twins of 201-210; 242/244 the false compounds;
        // 330/331/340/341 the cascade under a section whose condition is false.
        // Section 220 holds only those false twins, so it is hidden as empty.
        expect(hiddenIds(engine, MATRIX.valid)).toEqual([
            220, 221, 222, 223, 224, 225, 226, 227, 228, 229, 230, 242, 244, 263, 264, 266, 270, 271, 330, 331, 340,
            341,
        ])
    })

    describe('conditions against non-scalar fields keep scalar semantics', () => {
        // This is the one seam the branch touched: ConditionEvaluator gained a
        // set-oriented path, gated on the referenced field being `multiselect`.
        // Every id below would flip if that gate ever widened to `array`.
        const visible = (id: number) => engine.getVisibilityMap(MATRIX.valid).get(id)

        it('treats an empty array as set, not as unset', () => {
            expect(visible(262)).toBe(true) // { field: 9 (value []), op: 'set' }
            expect(visible(263)).toBe(false) // { field: 9, op: 'notset' }
        })

        it('compares an array value by reference, so eq never matches', () => {
            expect(visible(264)).toBe(false) // { field: 6 (value ['x','y']), op: 'eq', value: ['x','y'] }
            expect(visible(265)).toBe(true) // ...and ne therefore always matches
        })

        it('tests in/notin against the whole array, not its members', () => {
            expect(visible(266)).toBe(false) // { field: 6, op: 'in', value: ['x','z'] }
            expect(visible(267)).toBe(true) // { field: 6, op: 'notin', value: ['x','z'] }
        })

        it('treats any file object as set and compares it by reference', () => {
            expect(visible(269)).toBe(true)
            expect(visible(270)).toBe(false)
            expect(visible(271)).toBe(false) // structurally equal literal still does not match
        })
    })

    it('validates a fully-filled document clean', () => {
        const result = engine.validate(MATRIX.valid)

        expect(result.valid).toBe(true)
        expect(result.fieldErrors.size).toBe(0)
        expect(result.documentErrors ?? []).toEqual([])
    })

    it('produces exactly the 4.0.1 error set for a document that trips every rule', () => {
        const result = engine.validate(MATRIX.invalid)

        expect(result.valid).toBe(false)
        expect(flatten(result.fieldErrors)).toEqual([
            { fieldId: 401, rule: 'REQUIRED', params: undefined, itemIndex: undefined, itemFieldId: undefined },
            {
                fieldId: 402,
                rule: 'MIN_LENGTH',
                params: { minLength: 5, actual: 3 },
                itemIndex: undefined,
                itemFieldId: undefined,
            },
            {
                fieldId: 403,
                rule: 'MAX_LENGTH',
                params: { maxLength: 3, actual: 6 },
                itemIndex: undefined,
                itemFieldId: undefined,
            },
            { fieldId: 404, rule: 'PATTERN', params: undefined, itemIndex: undefined, itemFieldId: undefined },
            { fieldId: 406, rule: 'MIN', params: { min: 10, actual: 5 }, itemIndex: undefined, itemFieldId: undefined },
            {
                fieldId: 407,
                rule: 'MAX',
                params: { max: 100, actual: 500 },
                itemIndex: undefined,
                itemFieldId: undefined,
            },
            {
                fieldId: 410,
                rule: 'MIN_DATE',
                params: { minDate: '2025-01-01T00:00:00.000Z' },
                itemIndex: undefined,
                itemFieldId: undefined,
            },
            {
                fieldId: 411,
                rule: 'MAX_DATE',
                params: { maxDate: '2025-12-31T00:00:00.000Z' },
                itemIndex: undefined,
                itemFieldId: undefined,
            },
            {
                fieldId: 413,
                rule: 'MIN_ITEMS',
                params: { minItems: 2, actual: 1 },
                itemIndex: undefined,
                itemFieldId: undefined,
            },
            {
                fieldId: 414,
                rule: 'MAX_ITEMS',
                params: { maxItems: 2, actual: 3 },
                itemIndex: undefined,
                itemFieldId: undefined,
            },
            {
                fieldId: 417,
                rule: 'MAX_DATE',
                params: { maxDate: '2025-06-22T00:00:00.000Z' },
                itemIndex: undefined,
                itemFieldId: undefined,
            },
            {
                fieldId: 418,
                rule: 'TYPE',
                params: { expectedType: 'number' },
                itemIndex: undefined,
                itemFieldId: undefined,
            },
            { fieldId: 419, rule: 'INVALID_DATE', params: undefined, itemIndex: undefined, itemFieldId: undefined },
            { fieldId: 420, rule: 'INVALID_OPTION', params: undefined, itemIndex: undefined, itemFieldId: undefined },
            {
                fieldId: 501,
                rule: 'MIN_LENGTH',
                params: { minLength: 2, actual: 1 },
                itemIndex: 0,
                itemFieldId: undefined,
            },
        ])
    })

    it('covers all 13 legacy rule codes', () => {
        const seen = new Set(flatten(engine.validate(MATRIX.invalid).fieldErrors).map((e) => e.rule))

        expect([...seen].sort()).toEqual([...LEGACY_RULE_CODES].sort())
    })

    it('resolves relative date bounds against the document submittedAt', () => {
        // matrix.shifted is byte-identical to matrix.valid except form.submittedAt,
        // which moves 2025-06-15 -> 2025-09-01. Field 416 carries minDate '-1m'.
        expect(engine.validate(MATRIX.valid).fieldErrors.size).toBe(0)
        expect(flatten(engine.validate(MATRIX.shifted).fieldErrors)).toEqual([
            {
                fieldId: 416,
                rule: 'MIN_DATE',
                params: { minDate: '2025-08-01T00:00:00.000Z' },
                itemIndex: undefined,
                itemFieldId: undefined,
            },
        ])
    })

    it('skips validation for fields hidden by a parent section cascade', () => {
        // 331 and 341 are `required` and empty, but sit under section 330 whose
        // condition is false. 4.0.1 does not validate hidden fields.
        const result = engine.validate(MATRIX.valid)

        expect(result.fieldErrors.has(331)).toBe(false)
        expect(result.fieldErrors.has(341)).toBe(false)
    })
})

describe.each(LEGACY_CORPUS)('backward compatibility -- $slug', ({ definition, document }) => {
    it('compiles without a DocumentError', () => {
        expect(() => new FormEngine(definition)).not.toThrow()
    })

    it('validates to a stable result using only legacy rule codes', () => {
        const engine = new FormEngine(definition)
        const first = engine.validate(document)
        const second = engine.validate(document)

        expect(flatten(first.fieldErrors)).toEqual(flatten(second.fieldErrors))
        for (const error of flatten(first.fieldErrors)) {
            expect(LEGACY_RULE_CODES).toContain(error.rule)
            // `itemFieldId` is new in this release and belongs to array_obj only.
            expect(error.itemFieldId).toBeUndefined()
        }
    })

    it('reports no document-level errors', () => {
        const engine = new FormEngine(definition)

        expect(engine.validate(document).documentErrors ?? []).toEqual([])
    })

    it('resolves visibility over exactly the ids in contentOrder', () => {
        const engine = new FormEngine(definition)
        const map = engine.getVisibilityMap(document)

        expect([...map.keys()].sort((a, b) => a - b)).toEqual([...engine.contentOrder].sort((a, b) => a - b))
        expect([...engine.getVisibilityMap(document)]).toEqual([...map])
    })

    it('never validates a hidden field', () => {
        const engine = new FormEngine(definition)
        const result = engine.validate(document)

        for (const [id, visible] of engine.getVisibilityMap(document)) {
            if (!visible) expect(result.fieldErrors.has(id)).toBe(false)
        }
    })

    it('leaves the new FieldEntry.items property undefined on every entry', () => {
        const engine = new FormEngine(definition)

        for (const id of engine.contentOrder) {
            expect(engine.getFieldDef(id)?.items).toBeUndefined()
        }
    })

    it('round-trips through dumpDocument / loadDocument', () => {
        const engine = new FormEngine(definition)

        expect(engine.loadDocument(engine.dumpDocument(document))).toStrictEqual(document)
    })

    it('creates a document with no suggestions key', () => {
        const engine = new FormEngine(definition)
        const created = engine.createFormDocument(document.values)

        expect('suggestions' in created).toBe(false)
        expect(created.form.id).toBe(definition.id)
        expect(created.form.version).toBe(definition.version)
        expect(created.values).toStrictEqual(document.values)
    })
})

describe('backward compatibility -- exact visibility of the nine sample forms', () => {
    /**
     * The precise set of ids each legacy document hides. Part B only proves the
     * visibility map is stable and covers the right ids; that would still pass if
     * a regression flipped a field from visible to hidden. This pins the answer.
     *
     * `compliance-program-assessment` is hand-verified, because it holds the only
     * ordering operators in the real corpus:
     *   id 3  <- { field: 1, op: 'lte', value: 2 }, field 1 = 4  -> false, hidden
     *   id 6  <- { field: 5, op: 'lte', value: 2 }, field 5 = 4  -> false, hidden
     *   id 2  <- { field: 1, op: 'gte', value: 4 }, field 1 = 4  -> true,  visible
     *   id 10 <- { field: 9, op: 'gte', value: 3 }, field 9 = 4  -> true,  visible
     * The other eight are locked from current behaviour as drift guards.
     */
    const EXPECTED_HIDDEN_IDS: Record<string, number[]> = {
        'compliance-disclosure': [
            25, 26, 27, 28, 35, 41, 42, 43, 49, 50, 51, 52, 55, 60, 61, 62, 63, 64, 65, 66, 67, 71, 72, 73, 74, 75, 76,
            87, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125,
            126, 127, 128, 129, 130, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142,
        ],
        'compliance-program-assessment': [3, 6],
        'custody-assessment': [],
        'portfolio-declaration': [6],
        'regulatory-compliance': [8, 17, 42, 49, 50, 67, 68, 115, 155, 219, 220, 221, 223, 224, 268, 273, 296, 298],
        'suspicious-activity-report': [3, 9],
        'token-listing-application': [7, 18, 19],
        'travel-rule-report': [10, 20],
        'vasp-registration': [22, 25],
    }

    it.each(LEGACY_SAMPLES)('$slug hides exactly the ids it hid under 4.0.1', ({ slug, definition, document }) => {
        const engine = new FormEngine(definition)

        expect(hiddenIds(engine, document)).toEqual(EXPECTED_HIDDEN_IDS[slug])
    })

    it('resolves the only gte/lte conditions in the real corpus as 4.0.1 did', () => {
        const fixture = LEGACY_SAMPLES.find((f) => f.slug === 'compliance-program-assessment')
        const engine = new FormEngine((fixture as (typeof LEGACY_SAMPLES)[number]).definition)
        const map = engine.getVisibilityMap((fixture as (typeof LEGACY_SAMPLES)[number]).document)

        expect(map.get(2)).toBe(true) // gte, boundary: 4 >= 4
        expect(map.get(10)).toBe(true) // gte: 4 >= 3
        expect(map.get(3)).toBe(false) // lte: 4 <= 2 is false
        expect(map.get(6)).toBe(false) // lte: 4 <= 2 is false
    })
})

describe('backward compatibility -- the nine sample forms all validate clean', () => {
    // Every sample document on `main` was authored fully filled against its own
    // definition. Pinning this as a single expectation means a regression that
    // makes any legacy document spuriously invalid fails loudly and by name.
    it.each(LEGACY_SAMPLES)('$slug', ({ definition, document }) => {
        const result = new FormEngine(definition).validate(document)

        expect(flatten(result.fieldErrors)).toEqual([])
        expect(result.valid).toBe(true)
    })
})
