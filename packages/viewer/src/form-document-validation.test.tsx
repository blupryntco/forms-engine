import type { FC, PropsWithChildren } from 'react'

import type { DocumentValidationError, FormDefinition, FormDocument, FormValues } from '@bluprynt/forms-core'
import { render, screen } from '@testing-library/react'

import { Form } from './form-context'
import { FormDocumentValidation } from './form-document-validation'

const MockContainer: FC<PropsWithChildren> = jest.fn((props) => (
    <div data-testid="doc-errors-container">{props.children}</div>
))

const MockError: FC<DocumentValidationError> = jest.fn((props) => (
    <div data-testid={`doc-error-${props.code}`}>{props.message}</div>
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

const renderDocValidation = (formProps: { definition?: FormDefinition; data?: FormDocument }) =>
    render(
        <Form {...formProps}>
            <FormDocumentValidation container={MockContainer} error={MockError} />
        </Form>,
    )

beforeEach(() => {
    jest.clearAllMocks()
})

describe('FormDocumentValidation', () => {
    it('renders document-level errors from invalid definition', () => {
        // Duplicate IDs trigger a DocumentError in the FormEngine constructor
        const definition = baseDef([
            { id: 1, type: 'string', label: 'Name' },
            { id: 1, type: 'number', label: 'Duplicate' },
        ])
        const values = { '1': 'Alice' }

        renderDocValidation({ definition, data: doc(values) })

        expect(screen.getByTestId('doc-errors-container')).toBeTruthy()
        expect(screen.getByTestId('doc-error-DUPLICATE_ID')).toBeTruthy()
    })

    it('renders document errors from invalid submittedAt', () => {
        const definition = baseDef([{ id: 1, type: 'string', label: 'Name' }])
        // Invalid submittedAt
        const data: FormDocument = {
            form: { id: 'test-form', version: '1.0.0', submittedAt: 'not-a-date' },
            values: { '1': 'Alice' },
        }

        renderDocValidation({ definition, data })

        expect(screen.getByTestId('doc-errors-container')).toBeTruthy()
        expect(screen.getByTestId('doc-error-FORM_SUBMITTED_AT_INVALID')).toBeTruthy()
    })

    it('renders using provided container and error components', () => {
        const definition = baseDef([
            { id: 1, type: 'string', label: 'Name' },
            { id: 1, type: 'number', label: 'Duplicate' },
        ])

        renderDocValidation({ definition, data: doc({}) })

        expect(MockContainer).toHaveBeenCalled()
        expect(MockError).toHaveBeenCalled()
    })

    it('returns null when no document errors', () => {
        const definition = baseDef([{ id: 1, type: 'string', label: 'Name' }])
        const values = { '1': 'Alice' }

        const { container } = renderDocValidation({ definition, data: doc(values) })

        expect(container.innerHTML).toBe('')
    })

    it('returns null when no definition or data provided', () => {
        const { container } = renderDocValidation({})

        // documentErrors is empty when there's no definition or data
        expect(container.innerHTML).toBe('')
    })
})
