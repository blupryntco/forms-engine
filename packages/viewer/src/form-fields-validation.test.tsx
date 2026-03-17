import { type FC, type PropsWithChildren } from 'react'

import type { FieldValidationError, FormDefinition, FormDocument, FormValues } from '@bluprynt/forms-core'
import { render, screen } from '@testing-library/react'

import { Form } from './form-context'
import { type FieldValidationFieldEntry, FormFieldsValidation } from './form-fields-validation'

const MockContainer: FC<PropsWithChildren> = jest.fn((props) => (
    <div data-testid="validation-container">{props.children}</div>
))

const MockField: FC<PropsWithChildren<FieldValidationFieldEntry>> = jest.fn((props) => (
    <div data-testid={`field-errors-${props.field?.id ?? 'unknown'}`}>{props.children}</div>
))

const MockError: FC<FieldValidationError> = jest.fn((props) => (
    <span data-testid={`error-${props.fieldId}-${props.rule}`}>{props.message}</span>
))

const baseDef = (content: FormDefinition['content']): FormDefinition => ({
    id: 'test-form',
    version: '1.0.0',
    title: 'Test Form',
    content,
})

const doc = (values: FormValues = {}, submittedAt: string = '2025-06-15T00:00:00.000Z'): FormDocument => ({
    form: { id: 'test-form', version: '1.0.0', submittedAt },
    values,
})

const renderFieldsValidation = (formProps: { definition: FormDefinition; data: FormDocument }) =>
    render(
        <Form {...formProps}>
            <FormFieldsValidation container={MockContainer} field={MockField} error={MockError} />
        </Form>,
    )

beforeEach(() => {
    jest.clearAllMocks()
})

describe('FormFieldsValidation', () => {
    it('renders field errors grouped by field', () => {
        const definition = baseDef([
            { id: 1, type: 'string', label: 'Name', validation: { required: true, minLength: 3 } },
            { id: 2, type: 'number', label: 'Age', validation: { required: true } },
        ])
        // Both fields invalid: empty name (required + minLength) and missing age (required)
        const values = { '1': '' }

        renderFieldsValidation({ definition, data: doc(values) })

        expect(screen.getByTestId('validation-container')).toBeTruthy()
        expect(screen.getByTestId('field-errors-1')).toBeTruthy()
        expect(screen.getByTestId('field-errors-2')).toBeTruthy()

        // Error components rendered
        expect(screen.getByTestId('error-1-REQUIRED')).toBeTruthy()
        expect(screen.getByTestId('error-2-REQUIRED')).toBeTruthy()
    })

    it('filters by visibility (hidden fields excluded)', () => {
        const definition = baseDef([
            { id: 1, type: 'boolean', label: 'Toggle' },
            {
                id: 2,
                type: 'string',
                label: 'Conditional',
                validation: { required: true },
                condition: { field: 1, op: 'eq' as const, value: true },
            },
            { id: 3, type: 'string', label: 'Visible', validation: { required: true } },
        ])
        // Toggle off => field 2 hidden
        const values = { '1': false }

        renderFieldsValidation({ definition, data: doc(values) })

        // Field 3 has errors (visible, required, no value)
        expect(screen.getByTestId('field-errors-3')).toBeTruthy()
        // Field 2 is hidden — should not appear
        expect(screen.queryByTestId('field-errors-2')).toBeNull()
    })

    it('does not render when no fields have errors', () => {
        const definition = baseDef([
            { id: 1, type: 'string', label: 'Name' },
            { id: 2, type: 'number', label: 'Age' },
        ])
        const values = { '1': 'Alice', '2': 30 }

        const { container } = renderFieldsValidation({ definition, data: doc(values) })

        // No validation errors => returns null
        expect(container.innerHTML).toBe('')
    })

    it('renders using provided container, field, and error components', () => {
        const definition = baseDef([{ id: 1, type: 'string', label: 'Name', validation: { required: true } }])
        const values = {}

        renderFieldsValidation({ definition, data: doc(values) })

        expect(MockContainer).toHaveBeenCalled()
        expect(MockField).toHaveBeenCalled()
        expect(MockError).toHaveBeenCalled()

        // Verify field component received correct props
        const fieldCalls = (MockField as jest.Mock).mock.calls
        const firstFieldProps = fieldCalls[0][0] as FieldValidationFieldEntry
        expect(firstFieldProps.field).toBeDefined()
        expect(firstFieldProps.field?.id).toBe(1)
        expect(firstFieldProps.errors.length).toBeGreaterThan(0)
    })
})
