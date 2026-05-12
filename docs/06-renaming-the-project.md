# Renombrar el proyecto

Después de clonar con `degit`, hacé estos reemplazos antes de cualquier
otra cosa. Son ~5 minutos.

## Decidí dos nombres

| Variable | Ejemplo |
|----------|---------|
| `<paquete>` | `mi-saas` (npm-friendly, minúsculas + guiones) |
| `<Nombre>` | `Mi SaaS` (human-readable, va en README/UI) |

## 1. Namespace de packages

Reemplazar **en todo el repo**:

```
@evalencia-stack/  →  @<paquete>/
```

Archivos afectados (verificá):

- `apps/web/package.json` → `name`, `dependencies.@evalencia-stack/*`
- `packages/db/package.json` → `name`
- `packages/config/package.json` → `name`
- `apps/web/tsconfig.json` → `extends`
- Imports en código (`import { db } from '@evalencia-stack/db'` → `@<paquete>/db`)

Comando rápido (PowerShell):

```powershell
Get-ChildItem -Recurse -File | Where-Object { $_.FullName -notmatch 'node_modules|\.next' } |
  ForEach-Object {
    (Get-Content $_.FullName -Raw) -replace '@evalencia-stack/', '@<paquete>/' |
      Set-Content $_.FullName
  }
```

Linux/Mac:

```bash
grep -rl '@evalencia-stack/' --exclude-dir=node_modules --exclude-dir=.next . |
  xargs sed -i '' 's|@evalencia-stack/|@<paquete>/|g'
```

## 2. Nombre del root package

`package.json` (raíz):

```diff
-  "name": "evalencia-stack",
+  "name": "<paquete>",
```

## 3. Metadata visible al user

- `apps/web/src/app/layout.tsx` → `metadata.title.default`
- `apps/web/src/app/page.tsx` → landing
- `README.md` → reemplazar título, descripción, links

## 4. `CLAUDE.md`

El `CLAUDE.md` del template está pensado para el repo del template.
Reemplazalo por uno específico del proyecto:

```markdown
# CLAUDE.md — <Nombre>

Proyecto generado desde `evalencia-stack`.

## Reglas del template

Las reglas inviolables del template se mantienen — ver el CLAUDE.md
original [acá](../evalencia-stack/CLAUDE.md) o leer las del template.

## Reglas específicas de este proyecto

- ...

## Comandos

- `pnpm dev` — levantar web en localhost:3000
- ...
```

## 5. Supabase

- Crear un proyecto Supabase NUEVO (no reusar el del template).
- Settings → General → nombre del proyecto.
- Settings → Authentication → Site URL + Redirect URLs.

## 6. Git remote

```bash
git init
git add -A
git commit -m "Initial commit from evalencia-stack"
git remote add origin git@github.com:tu-org/<paquete>.git
git push -u origin main
```

(`degit` ya borra el `.git`, por eso `git init`.)

## 7. Verificar

```bash
pnpm install
pnpm typecheck
pnpm build
```

Si todo pasa, listo. Arrancá con `pnpm dev`.
