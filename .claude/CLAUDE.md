# Bluprynt Forms Engine

## 1. Overview

Forms Engine is a system that allows users to define custom form schemas, publish them, and enable other users to fill, validate, view, and edit forms based on those schemas. The engine operates on JSON-based form definitions and produces JSON-based form values.

See [Form Schema](./SCHEMA.md) for details of how form schemas are defined.

## 2. Core Concepts

### 2.1 Form Schema

A form schema is a JSON document that describes the structure of a form: its fields, sections, validation rules, and conditional visibility rules.

### 2.2 Form Values

Form values is a JSON document that contains user-submitted data corresponding to a specific form schema. Form documents carry a required `submittedAt` (ISO 8601) timestamp that serves as the sole reference time for relative date resolution (e.g., `"+7d"`, `"-1m"`). Missing `submittedAt` produces a `FORM_SUBMITTED_AT_MISSING` document error; invalid values produce a `FORM_SUBMITTED_AT_INVALID` document error.

### 2.3 Editors

- **`FormDefinitionEditor`** — fluent builder for programmatically constructing and modifying form schemas (`FormDefinition`). Operates on the schema structure: add/remove/move fields and sections, set validation rules, configure conditions and options.
- **`FormValuesEditor`** — fluent editor for programmatically reading and writing form values against a `FormDefinition`. Wraps a `FormEngine` and a mutable `FormDocument`. Supports setting/clearing field values, array item manipulation (add, remove, move, set), validation, and visibility queries.

## 3. Field Types

Each field in a form has a type. The following types must be supported:

| Type | Description |
|------|-------------|
| **string** | Text input |
| **number** | Numeric input |
| **boolean** | True/false toggle |
| **date** | Date picker |
| **select** | Single selection from a predefined list of options |
| **array** | A list of values (any of existing field types described above) |
| **file** | File upload (stores name, MIME type, size, URL) |

Future consideration: custom field types with type-specific properties.

## 4. Validation Rules

Each field may have validation rules depending on its type:

| Type | Supported Validation Rules |
|------|---------------------------|
| **string** | required, min length, max length, pattern (regex) |
| **number** | required, min value, max value |
| **boolean** | required |
| **date** | required, min date, max date |
| **select** | required |
| **array** | min items, max items |
| **file** | required |

## 5. Sections

- Fields can exist at the top level of the form or be grouped into sections.
- Sections can be nested up to **3 levels deep**.
- A section contains fields and/or child sections.

## 6. Conditionals

Conditionals control the visibility of individual fields or entire sections based on the values of other fields.

### 6.1 Supported Condition Operators

| Operator | Description |
|----------|-------------|
| **set** | Field has a value |
| **notset** | Field has no value |
| **eq** | Field value equals a given value |
| **ne** | Field value does not equal a given value |
| **lt** | Field value is less than a given value |
| **gt** | Field value is greater than a given value |
| **lte** | Field value is less than or equal to a given value |
| **gte** | Field value is greater than or equal to a given value |
| **in** | Field value is contained in a given array |
| **notin** | Field value is not contained in a given array |

### 6.2 Conditional Behavior

- A conditional references another field in the form by its identifier.
- When a conditional evaluates to false, the associated field or section must be hidden.
- When a conditional evaluates to true, the associated field or section must be shown.
- Conditionals must be evaluated dynamically as form values change.
- When a conditional field is hidden we do not consider it in form validation at all.

## 7. Workflows

### 7.1 Define Form Schema

A user creates a form schema via a UI by composing fields, organizing them into sections, configuring validation rules, and setting up conditionals. The output is a JSON file representing the form schema.

### 7.2 Publish Form Schema

The user publishes the form schema so that it becomes available to other users.

### 7.3 Fill a New Form

Another user receives a published form schema. The system renders a form UI based on the schema. Requirements:

- All conditional rules must be enforced in real time (fields/sections show/hide dynamically).
- The user fills in the form and submits it.
- On submission, validation rules must be evaluated against the entered values.
- If validation fails, the system must clearly indicate which fields are invalid and why. JSON file with values should be produced anyway.
- If validation passes, the system produces a JSON file containing the form values.

### 7.4 View a Filled Form (Read-Only)

Given a form schema and a set of form values, the system must render the form in a read-only view. Requirements:

- Conditional rules must be applied — only fields/sections whose conditions are met should be visible.
- Validation state must be displayable (highlight invalid fields if requested).

### 7.5 Edit an Existing Form

Given a form schema and an existing set of form values, the system must render an editable form pre-populated with the existing values. Requirements:

- All conditional rules must be enforced dynamically.
- Validation rules must be evaluated on re-submission.
- The output is an updated JSON file with the new form values.