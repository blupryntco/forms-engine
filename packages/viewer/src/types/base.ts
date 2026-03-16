import type { FieldContentItem, FieldValidationError } from '@bluprynt/forms-core'

export type BaseViewFieldProps = {
    field: FieldContentItem
    errors: FieldValidationError[]
}

export type BaseEditFieldProps = BaseViewFieldProps & {
    onChange: (value: unknown) => void
}

export type ErrorProps = {
    errors: FieldValidationError[]
    field: FieldContentItem
}
