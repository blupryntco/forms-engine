# Forms & Validation

## useForm() Hook

Custom hook composing Formik + Zod + TanStack Query mutations:

```tsx
const { values, setFieldValue, isValid, isSubmitting, submitForm, submitError, validationErrors } =
    useForm({
        schema: IssueLicenseFormSchema,
        initialValues: { id: params.id, notes: '' },
        onSubmit: issueLicenseMutation,
        onSuccess: (result) => {
            // Handle success (close modal, navigate, etc.)
        },
    })
```

**Parameters**:
- `schema` — Zod schema for validation (`schema.safeParseAsync()`)
- `initialValues` — Formik initial form state
- `onSubmit` — TanStack Query mutation options
- `onSuccess` — Callback after successful mutation

**Returns**:
- `values` — Current form values
- `setFieldValue` — Formik field setter
- `isValid` — Zod validation passed
- `isSubmitting` — Mutation in progress
- `submitForm` — Trigger form submission
- `submitError` — Mutation error message
- `validationErrors` — Per-field Zod validation errors

## Form Compound Component

```tsx
<Form>
    <Form.Item label="Secret">
        <TextInput
            value={values.secret}
            onChange={(value) => setFieldValue('secret', value)}
        />
    </Form.Item>
    <Form.Elements>
        <Button onClick={submitForm} loading={isSubmitting} disabled={!isValid}>
            Submit
        </Button>
    </Form.Elements>
    <Form.Error>{submitError}</Form.Error>
</Form>
```

**Sub-components**:
- `Form` — Root form container
- `Form.Item` — Labeled field wrapper
- `Form.Text` — Static text row
- `Form.Elements` — Action buttons row
- `Form.Error` — Submission error display

## Zod Schema Patterns (Zod 4)

Define validation schemas in feature `model/` files:

```tsx
// features/licenses/issue-license/model/issue-license-form.ts
import { z } from 'zod'

export const IssueLicenseFormSchema = z.object({
    id: z.number(),
    notes: z.string().min(1, 'Notes are required'),
})

export type IssueLicenseForm = z.infer<typeof IssueLicenseFormSchema>
```

**Patterns**:
- Schema and inferred type co-located in same file
- Schema name: `<FeatureName>FormSchema`
- Type name: `<FeatureName>Form` (inferred from schema)
- Validation messages inline in schema definition

**Zod 4 notes**:
- `z.infer`, `z.object`, `z.string`, `z.number` etc. — API unchanged
- Error formatting: `error.format()` and `error.flatten()` are deprecated — use `z.treeifyError(error)` instead
- `z.ZodTypeAny` is removed — use `z.ZodType` directly
- `z.ostring()`, `z.onumber()` removed — use `z.string().optional()` etc.

## Mutation Integration

Feature mutations handle form submission, cache invalidation, and atom updates:

```tsx
// features/licenses/issue-license/model/issue-license-form.ts
export const issueLicenseMutation = (applicationId: number) => ({
    mutationKey: keys.mutations.licenses.issue,
    mutationFn: async (form: IssueLicenseForm): Promise<IssueLicenseResult> => {
        const { data } = await api('Licenses').issueLicense(applicationId, {
            notes: form.notes,
        })
        return { licenseId: data.id, status: data.status }
    },
    onSuccess: async ({ licenseId }) => {
        await queryClient.invalidateQueries({ queryKey: keys.queries.licenses.details(licenseId) })
        jotai.set(storeCredentialAtom, applicationId, { licenseId })
    },
    onError: (error) => {
        toast('error', extractError(error))
    },
})
```

## Modal Forms

Features that open as dialogs use shadcn `Dialog` with controlled `open` state:

```tsx
type AddCredentialDialogProps = PropsWithChildren<{
    applicationId: number
}>

export const AddCredentialDialog: FC<AddCredentialDialogProps> = ({ applicationId, children }) => {
    const [open, setOpen] = useState(false)

    const { values, setFieldValue, isSubmitting, isValid, submitForm, submitError } = useForm({
        schema: AddCredentialSchema,
        initialValues: { applicationId, name: '', value: '' },
        onSubmit: addCredentialMutation,
        onSuccess: () => setOpen(false),
    })

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add Credential</DialogTitle>
                </DialogHeader>
                <DialogBody>
                    <Form>
                        {/* Form fields */}
                        <Form.Error>{submitError}</Form.Error>
                    </Form>
                </DialogBody>
                <DialogFooter>
                    <Button onClick={submitForm} disabled={isSubmitting || !isValid}>
                        {isSubmitting && <LoaderCircle className="animate-spin" />}
                        Add
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
```

Dialog primitives (`Dialog`, `DialogTrigger`, `DialogContent`, etc.) are built on shadcn/Radix UI in `shared/ui/dialog/`.

## Feature Dialog Pattern

Features that combine a trigger element with a dialog + form. The trigger is passed as `children`:

```tsx
// features/users/create/ui/create-user-dialog.tsx
'use client'

type CreateUserDialogProps = PropsWithChildren

export const CreateUserDialog: FC<CreateUserDialogProps> = ({ children }) => {
    const [open, setOpen] = useState(false)

    const { values, setFieldValue, isSubmitting, isValid, submitForm, submitError } = useForm({
        schema: CreateUserSchema,
        initialValues: { phone: '', email: '', firstName: '', lastName: '' },
        onSubmit: createUserMutation,
        onSuccess: () => setOpen(false),
    })

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add User</DialogTitle>
                </DialogHeader>
                <DialogBody>
                    <Form>
                        <Form.Item label="Phone">
                            <TextInput
                                disabled={isSubmitting}
                                value={values.phone}
                                onChange={(value) => setFieldValue('phone', value)}
                            />
                        </Form.Item>
                        {/* More fields... */}
                        <Form.Error>{submitError}</Form.Error>
                    </Form>
                </DialogBody>
                <DialogFooter>
                    <Button onClick={submitForm} disabled={isSubmitting || !isValid}>
                        {isSubmitting && <LoaderCircle className="animate-spin" />}
                        Add
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
```

**Usage** — consumer provides the trigger element:

```tsx
<CreateUserDialog>
    <Button><UserRoundPlus /> Add User</Button>
</CreateUserDialog>
```

**Key aspects**:
- `PropsWithChildren` — trigger element passed as children
- `DialogTrigger asChild` — renders children as the trigger (no extra wrapper)
- `useForm` integrates Formik + Zod + React Query mutation
- `onSuccess: () => setOpen(false)` — auto-close dialog on success
- Always use `Form` compound component (not raw `<form>`) for consistent layout and error display
- Loading spinner in submit button
