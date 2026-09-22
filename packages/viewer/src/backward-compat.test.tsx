/**
 * Backward compatibility of the viewer and editor for a 4.0.1-era consumer.
 *
 * The scenario under test is an app that upgrades the package but changes
 * nothing: it still passes a component map containing only the eight keys that
 * existed in 4.0.1, and it still renders definitions and documents authored back
 * then. Nothing may become required, nothing may crash, and the props handed to
 * its existing renderers must stay usable.
 *
 * Two prop-shape deltas ARE introduced by this release. They do not break stored
 * data, but they change what an existing renderer receives, so they are pinned
 * explicitly at the bottom of this file rather than left to be discovered by an
 * app in production.
 */

import type { FC, ReactNode } from 'react'

import type {
    FieldContentItem,
    FieldValidationError,
    FormDefinition,
    FormDocument,
    SectionContentItem,
} from '@bluprynt/forms-core'
import { render, screen } from '@testing-library/react'

import portfolioDeclarationDefinition from './__fixtures__/backward_compatibility/portfolio-declaration.definition.json'
import portfolioDeclarationDocument from './__fixtures__/backward_compatibility/portfolio-declaration.document.json'
import travelRuleReportDefinition from './__fixtures__/backward_compatibility/travel-rule-report.definition.json'
import travelRuleReportDocument from './__fixtures__/backward_compatibility/travel-rule-report.document.json'
import { Form } from './form-context'
import { FormDocumentValidation } from './form-document-validation'
import { FormEditor } from './form-editor'
import { FormFieldsValidation } from './form-fields-validation'
import { FormSections } from './form-sections'
import { FormViewer } from './form-viewer'
import type { EditorComponentMap, ViewerComponentMap } from './types'

const LEGACY_FIXTURES = [
    {
        slug: 'travel-rule-report',
        definition: travelRuleReportDefinition as unknown as FormDefinition,
        document: travelRuleReportDocument as unknown as FormDocument,
    },
    {
        slug: 'portfolio-declaration',
        definition: portfolioDeclarationDefinition as unknown as FormDefinition,
        document: portfolioDeclarationDocument as unknown as FormDocument,
    },
]

const fieldId = (props: Record<string, unknown>) => (props.field as FieldContentItem).id

const MockString: FC<Record<string, unknown>> = jest.fn((props) => (
    <div data-testid={`string-${fieldId(props)}`}>{String(props.value ?? '')}</div>
))

const MockNumber: FC<Record<string, unknown>> = jest.fn((props) => (
    <div data-testid={`number-${fieldId(props)}`}>{String(props.value ?? '')}</div>
))

const MockBoolean: FC<Record<string, unknown>> = jest.fn((props) => (
    <div data-testid={`boolean-${fieldId(props)}`}>{String(props.value ?? '')}</div>
))

const MockDate: FC<Record<string, unknown>> = jest.fn((props) => (
    <div data-testid={`date-${fieldId(props)}`}>{String(props.value ?? '')}</div>
))

const MockSelect: FC<Record<string, unknown>> = jest.fn((props) => (
    <div data-testid={`select-${fieldId(props)}`}>{String(props.value ?? '')}</div>
))

const MockArray: FC<Record<string, unknown>> = jest.fn((props) => (
    <div data-testid={`array-${fieldId(props)}`}>{props.children as ReactNode}</div>
))

const MockFile: FC<Record<string, unknown>> = jest.fn((props) => (
    <div data-testid={`file-${fieldId(props)}`}>{(props.value as { name?: string })?.name ?? ''}</div>
))

const MockSection: FC<Record<string, unknown>> = jest.fn((props) => (
    <div data-testid={`section-${(props.section as SectionContentItem).id}`}>{props.children as ReactNode}</div>
))

const MockError: FC<Record<string, unknown>> = jest.fn((props) => (
    <div data-testid={`error-${fieldId(props)}`}>
        {(props.errors as FieldValidationError[]).map((e) => e.message).join(', ')}
    </div>
))

/**
 * Exactly the keys a 4.0.1 app supplied -- mirroring the playground's map on
 * `main`. The five new field types are deliberately absent: if any of them ever
 * became a required key, this literal would stop typechecking.
 */
const makeLegacyViewerComponents = (): ViewerComponentMap => ({
    string: MockString as ViewerComponentMap['string'],
    number: MockNumber as ViewerComponentMap['number'],
    boolean: MockBoolean as ViewerComponentMap['boolean'],
    date: MockDate as ViewerComponentMap['date'],
    select: MockSelect as ViewerComponentMap['select'],
    array: MockArray as ViewerComponentMap['array'],
    file: MockFile as ViewerComponentMap['file'],
    section: MockSection as ViewerComponentMap['section'],
    error: MockError as ViewerComponentMap['error'],
})

const makeLegacyEditorComponents = (): EditorComponentMap => ({
    string: MockString as unknown as EditorComponentMap['string'],
    number: MockNumber as unknown as EditorComponentMap['number'],
    boolean: MockBoolean as unknown as EditorComponentMap['boolean'],
    date: MockDate as unknown as EditorComponentMap['date'],
    select: MockSelect as unknown as EditorComponentMap['select'],
    array: MockArray as unknown as EditorComponentMap['array'],
    file: MockFile as unknown as EditorComponentMap['file'],
    section: MockSection as unknown as EditorComponentMap['section'],
    error: MockError as unknown as EditorComponentMap['error'],
})

const noop = () => {}

beforeEach(() => {
    jest.clearAllMocks()
})

describe.each(LEGACY_FIXTURES)('backward compatibility -- viewer -- $slug', ({ definition, document }) => {
    it('renders through FormViewer with a 4.0.1-only component map', () => {
        expect(() =>
            render(
                <Form definition={definition} data={document}>
                    <FormViewer components={makeLegacyViewerComponents()} />
                </Form>,
            ),
        ).not.toThrow()
    })

    it('renders through FormEditor with a 4.0.1-only component map and the original two props', () => {
        expect(() =>
            render(
                <Form definition={definition} data={document}>
                    <FormEditor components={makeLegacyEditorComponents()} onChange={noop} />
                </Form>,
            ),
        ).not.toThrow()
    })

    it('renders the auxiliary components unchanged', () => {
        const SectionsContainer: FC<Record<string, unknown>> = (props) => (
            <div data-testid="sections">{props.children as ReactNode}</div>
        )
        const SectionsItem: FC<Record<string, unknown>> = (props) => <div>{String(props.title ?? '')}</div>
        const ErrorsContainer: FC<Record<string, unknown>> = (props) => (
            <div data-testid="doc-errors">{props.children as ReactNode}</div>
        )
        const ErrorItem: FC<Record<string, unknown>> = () => <div />
        const FieldGroup: FC<Record<string, unknown>> = (props) => <div>{props.children as ReactNode}</div>

        expect(() =>
            render(
                <Form definition={definition} data={document}>
                    <FormSections container={SectionsContainer} item={SectionsItem} />
                    <FormDocumentValidation container={ErrorsContainer} error={ErrorItem} />
                    <FormFieldsValidation container={ErrorsContainer} field={FieldGroup} error={ErrorItem} />
                    <FormViewer components={makeLegacyViewerComponents()} />
                </Form>,
            ),
        ).not.toThrow()
    })
})

describe('backward compatibility -- viewer renders the right fields', () => {
    const { definition, document } = LEGACY_FIXTURES[0] as (typeof LEGACY_FIXTURES)[number]

    it('renders every field type a 4.0.1 definition can contain', () => {
        render(
            <Form definition={definition} data={document}>
                <FormViewer components={makeLegacyViewerComponents()} />
            </Form>,
        )

        // travel-rule-report exercises all seven 4.0.1 field types plus sections.
        expect(MockString).toHaveBeenCalled()
        expect(MockNumber).toHaveBeenCalled()
        expect(MockBoolean).toHaveBeenCalled()
        expect(MockDate).toHaveBeenCalled()
        expect(MockSelect).toHaveBeenCalled()
        expect(MockArray).toHaveBeenCalled()
        expect(MockFile).toHaveBeenCalled()
        expect(MockSection).toHaveBeenCalled()
    })

    it('does not render a field whose condition is false', () => {
        render(
            <Form definition={definition} data={document}>
                <FormViewer components={makeLegacyViewerComponents()} />
            </Form>,
        )

        const rendered = new Set(
            [MockString, MockNumber, MockBoolean, MockDate, MockSelect, MockArray, MockFile].flatMap((mock) =>
                (mock as unknown as jest.Mock).mock.calls.map(([props]) => (props.field as FieldContentItem).id),
            ),
        )

        // 10 is conditional on field 6 === 'incoming' (the document says 'outgoing');
        // 20 on field 19 === true (the document says false). Both must stay unrendered,
        // and every other field in the definition must be rendered.
        expect(rendered.has(10)).toBe(false)
        expect(rendered.has(20)).toBe(false)
        expect(rendered.has(9)).toBe(true)
        expect(rendered.has(19)).toBe(true)
    })

    it('hands a 4.0.1 field renderer the field, its value and its errors', () => {
        render(
            <Form definition={definition} data={document}>
                <FormViewer components={makeLegacyViewerComponents()} />
            </Form>,
        )

        expect(MockString).toHaveBeenCalledWith(
            expect.objectContaining({ field: expect.objectContaining({ type: 'string' }), errors: [] }),
            undefined,
        )
    })
})

describe('backward compatibility -- prop-shape deltas introduced by this release', () => {
    // Neither breaks stored data. Both change what an existing renderer receives,
    // so they are recorded here deliberately. If either ever changes again, this
    // block fails and the migration notes need updating.
    const { definition, document } = LEGACY_FIXTURES[0] as (typeof LEGACY_FIXTURES)[number]

    it('DELTA 1: the editor now passes suggestion handlers to every field, even with no suggestions block', () => {
        expect('suggestions' in document).toBe(false)

        render(
            <Form definition={definition} data={document}>
                <FormEditor components={makeLegacyEditorComponents()} onChange={noop} />
            </Form>,
        )

        const [props] = (MockString as unknown as jest.Mock).mock.calls[0] as [Record<string, unknown>]

        expect(typeof props.onAcceptSuggestion).toBe('function')
        expect(typeof props.onRejectSuggestion).toBe('function')
        // The suggestion itself is absent -- only the handlers are unconditional.
        expect('suggestion' in props).toBe(false)
    })

    it('DELTA 2: the synthetic field handed to an array item renderer now carries the metadata keys', () => {
        // portfolio-declaration's field 8 is an `array` of `string` with four
        // stored values, so the item renderer is genuinely invoked. (Using
        // travel-rule-report here would be a trap: its only array holds `file`
        // items, so MockString would never be called and this test would pass
        // while asserting nothing.)
        const arrayFixture = LEGACY_FIXTURES[1] as (typeof LEGACY_FIXTURES)[number]

        render(
            <Form definition={arrayFixture.definition} data={arrayFixture.document}>
                <FormViewer components={makeLegacyViewerComponents()} />
            </Form>,
        )

        const arrayProps = (MockArray as unknown as jest.Mock).mock.calls
            .map(([props]) => props as Record<string, unknown>)
            .find((props) => (props.field as FieldContentItem).id === 8)

        expect(arrayProps).toBeDefined()
        expect((arrayProps?.field as FieldContentItem).type).toBe('array')

        // getArrayField() synthesises the per-item field: it keeps the array's
        // own id but takes the item definition's label.
        const itemFields = (MockString as unknown as jest.Mock).mock.calls
            .map(([props]) => (props as Record<string, unknown>).field as Record<string, unknown>)
            .filter((field) => field.id === 8 && field.label === 'Wallet address')

        expect(itemFields).toHaveLength(4)

        for (const field of itemFields) {
            expect('description' in field).toBe(true)
            expect('placeholder' in field).toBe(true)
            expect('answer_guidelines' in field).toBe(true)
            expect('reference_id' in field).toBe(true)
        }
    })
})

describe('backward compatibility -- new field types need no component', () => {
    it('skips a field whose type has no component instead of throwing', () => {
        // On 4.0.1 an unresolvable component rendered `undefined` and React threw.
        // The branch skips it. An app that upgrades without adding the new
        // renderers therefore degrades quietly rather than crashing.
        const definition = {
            id: 'mixed',
            version: '1.0.0',
            title: 'Mixed',
            content: [
                { id: 1, type: 'string', label: 'Old field' },
                { id: 2, type: 'multiselect', label: 'New field', options: [{ value: 'a', label: 'A' }] },
                { id: 3, type: 'blockchain', label: 'New field 2' },
            ],
        } as unknown as FormDefinition
        const document = {
            form: { id: 'mixed', version: '1.0.0', submittedAt: '2025-06-15T00:00:00.000Z' },
            values: { '1': 'kept', '2': ['a'], '3': 'eip155:1:0x0' },
        } as unknown as FormDocument

        render(
            <Form definition={definition} data={document}>
                <FormViewer components={makeLegacyViewerComponents()} />
            </Form>,
        )

        expect(screen.getByTestId('string-1').textContent).toBe('kept')
        expect(screen.queryByTestId('string-2')).toBeNull()
    })
})
