# Auth Guard Pattern

Wraps the authenticated portion of the app. Lives in `app/` layer:

```tsx
// src/app/auth/auth.tsx
const Auth: FC<PropsWithChildren> = ({ children }) => {
    const auth = useAuth()
    const [initialized, setInitialized] = useState(false)

    useEffect(() => {
        invalidateAuth().finally(() => setInitialized(true))
    }, [])

    if (!initialized) return <LoadingSpinner />
    if (!auth) return <SignIn />
    return <>{children}</>
}
```

**Key aspects:**
- `invalidateAuth()` fetches current user on mount, stores in Jotai `authAtom`
- Shows loading spinner until auth state is determined
- Renders `SignIn` if unauthenticated, children if authenticated

```tsx
// app/(auth)/layout.tsx
const AuthLayout: FC<PropsWithChildren> = ({ children }) => (
    <Auth>
        <Sidebar />
        <main>{children}</main>
    </Auth>
)
```
