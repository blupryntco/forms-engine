# Toast Notifications

Use `sonner` for all toast notifications:

```tsx
import { toast } from 'sonner'

toast.success('User created')
toast.error('Failed', { description: error.message })
```

**Conventions:**
- `toast.success()` in mutation `onSuccess` callbacks
- `toast.error()` in mutation `onError` callbacks
- Keep messages short (2-4 words for title)
- Use `description` for error details
