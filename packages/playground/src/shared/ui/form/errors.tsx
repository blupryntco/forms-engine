import type { FC, PropsWithChildren } from 'react'

import type { DocumentValidationError, FieldValidationError, FieldValidationFieldEntry } from '@bluprynt/forms-viewer'

export const DocumentErrorsContainer: FC<PropsWithChildren> = ({ children }) => (
    <div className="mb-3 rounded border border-red-200 bg-red-50 p-3">{children}</div>
)

export const DocumentErrorItem: FC<DocumentValidationError> = ({ code, message }) => (
    <p className="text-xs text-red-600">
        <span className="font-medium">{code}</span>: {message}
    </p>
)

export const FieldErrorsContainer: FC<PropsWithChildren> = ({ children }) => (
    <div className="mb-3 rounded border border-yellow-200 bg-yellow-50 p-3">{children}</div>
)

export const FieldErrorGroup: FC<PropsWithChildren & FieldValidationFieldEntry> = ({ field, children }) => (
    <div className="mb-1 last:mb-0">
        <p className="text-xs font-medium text-yellow-800">{field?.label ?? `Field #${field?.id ?? 'unknown'}`}</p>
        <div className="ml-2">{children}</div>
    </div>
)

export const FieldErrorItem: FC<FieldValidationError> = ({ message, itemIndex }) => (
    <p className="text-xs text-yellow-700">
        {itemIndex !== undefined && <span>[{itemIndex}] </span>}
        {message}
    </p>
)
