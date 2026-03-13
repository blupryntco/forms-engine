import type { ArrayValidation } from './array'
import type { BooleanValidation } from './boolean'
import type { DateValidation } from './date'
import type { FileValidation } from './file'
import type { NumberValidation } from './number'
import type { SelectValidation } from './select'
import type { StringValidation } from './string'

/**
 * Union of all type-specific validation rule shapes.
 * The applicable shape depends on the field's {@link FieldType}.
 */
export type TypeSpecificValidation =
    | StringValidation
    | NumberValidation
    | BooleanValidation
    | DateValidation
    | SelectValidation
    | ArrayValidation
    | FileValidation
