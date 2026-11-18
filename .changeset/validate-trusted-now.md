---
"@bluprynt/forms-core": patch
---

Let the caller set a trusted reference time for relative dates.

`FormEngine.validate`, `isVisible` and `getVisibilityMap` (and the matching `FormValuesEditor` methods) take an
optional `EvaluationOptions` argument. When `options.now` is set, relative dates such as `"+7d"` in `minDate`,
`maxDate` and condition values resolve against it instead of `doc.form.submittedAt`. The client controls
`submittedAt`, so server-side validation should pass `{ now: new Date() }`. Without options, behaviour is unchanged.

`submittedAt` is still required and checked when `now` is passed. An invalid `now` makes `validate` return the new
`NOW_INVALID` document error; `isVisible` and `getVisibilityMap` throw a `RangeError`.
