# Agregar un OAuth provider

El template soporta Google + GitHub out-of-the-box. Para sumar Apple,
Twitter, Facebook, Discord, etc., son tres pasos.

## 1. Habilitar en Supabase

**Authentication → Providers** → buscá el provider → toggle ON →
pegar `Client ID` + `Client Secret` (los obtenés del provider).

Cada provider tiene su propio setup; Supabase linkea las guías oficiales:

- Apple: https://supabase.com/docs/guides/auth/social-login/auth-apple
- Twitter (X): https://supabase.com/docs/guides/auth/social-login/auth-twitter
- Facebook: https://supabase.com/docs/guides/auth/social-login/auth-facebook
- Discord: https://supabase.com/docs/guides/auth/social-login/auth-discord
- LinkedIn: https://supabase.com/docs/guides/auth/social-login/auth-linkedin
- Microsoft (Azure): https://supabase.com/docs/guides/auth/social-login/auth-azure

## 2. Extender el tipo en código

En `apps/web/src/server/services/auth.service.ts`:

```typescript
export type OAuthProvider = 'google' | 'github' | 'apple' | 'discord';

const SUPPORTED_PROVIDERS: OAuthProvider[] = ['google', 'github', 'apple', 'discord'];
```

Supabase soporta los providers que cumplen el contrato OAuth — `provider`
es un string que el cliente Supabase reenvía. Si Supabase lo soporta,
agregarlo acá es declarativo.

## 3. Agregar el botón

En `apps/web/src/components/shared/auth-providers.tsx`, agregar un
botón nuevo:

```tsx
<Button
  type="button"
  variant="outline"
  disabled={isPending}
  onClick={() => startTransition(() => signInWithOAuthAction('apple'))}
>
  <AppleIcon className="h-4 w-4" />
  Apple
</Button>
```

(El icono podés tomarlo de `lucide-react` cuando exista, o copiar el SVG
oficial del brand.)

## Custom redirect URLs

Si tu provider exige un redirect URL específico (Apple es famoso por
esto), ponelo en la consola del provider apuntando a:

```
https://<tu-proyecto>.supabase.co/auth/v1/callback
```

Y verificá que en Supabase **Authentication → URL Configuration** tengas
`http://localhost:3000/api/auth/callback` (dev) y `https://tu-dominio/api/auth/callback`
(prod) en "Redirect URLs".

## SAML / SSO empresarial

Supabase tiene soporte SAML 2.0 en plan Pro. La integración en código es
similar a OAuth pero el `signInWithSSO()` recibe un `domain` en vez de
un `provider`. Documentar acá si tu proyecto lo necesita.
