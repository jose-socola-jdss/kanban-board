# Kanban — Mi Tablero

Tablero kanban personal para gestión de proyectos y tareas. Cada proyecto agrupa un conjunto de tareas que avanzan por tres columnas: **Pendientes → Para hoy → Finalizadas**. Al completar la última tarea de un proyecto se dispara una animación de celebración en pantalla completa. Las tareas también pueden crearse sin asociarlas a ningún proyecto.

### Nuevas Funcionalidades
- **Programación directa en "Para hoy"**: Ahora puedes definir la hora de inicio y fin directamente desde la tarjeta en la columna "Para hoy", sin abrir el modal.
- **Temporizador en tiempo real**: Las tareas con hora de fin programada muestran un temporizador con la cuenta regresiva de cuánto tiempo falta para terminar.
- **Sincronización de fecha local**: Corrección del desfase horario (UTC) al crear tareas; ahora siempre se usa la fecha local del usuario.

El modo claro usa un fondo azul-gris suave (`#EEF1F7`) con columnas y tarjetas en blanco puro, siguiendo la misma paleta de la interfaz de referencia fisholg.com.

**URL de producción:** https://kanban-board-ruby-nu.vercel.app

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| UI | React 18 + TypeScript |
| Estilos | Tailwind CSS |
| Drag & drop | @dnd-kit/core + @dnd-kit/sortable |
| Estado | Zustand |
| Base de datos | Supabase (PostgreSQL) |
| Autenticación | Supabase Auth (email + contraseña) |
| Build | Vite 5 |
| Deploy | Vercel |
| Repositorio | GitHub |

---

## Estructura del proyecto

```
src/
├── App.tsx                      # Raíz de la app — gestión de sesión y celebraciones
├── main.tsx                     # Punto de entrada
├── index.css                    # Estilos globales y animaciones CSS
├── vite-env.d.ts                # Tipos de variables de entorno Vite
│
├── components/
│   ├── Board.tsx                # Tablero kanban con lógica de drag & drop
│   ├── Column.tsx               # Columna individual
│   ├── TaskCard.tsx             # Tarjeta de tarea con celebración al completar
│   ├── DragCard.tsx             # Overlay durante el arrastre
│   ├── TaskModal.tsx            # Modal para crear/editar tareas
│   ├── MonthlyBoard.tsx         # Vista de proyectos
│   ├── GoalCard.tsx             # Tarjeta de proyecto
│   ├── GoalDragCard.tsx         # Overlay de proyecto durante arrastre
│   ├── GoalModal.tsx            # Modal para crear/editar proyectos
│   ├── Header.tsx               # Cabecera — navegación, tema y cierre de sesión
│   ├── Login.tsx                # Pantalla de login y registro
│   └── ActivityCelebration.tsx  # Animación de celebración al completar proyecto
│
├── store/
│   └── kanbanStore.ts           # Store Zustand — estado + sincronización con Supabase
│
├── lib/
│   ├── supabase.ts              # Cliente Supabase (singleton)
│   └── db.ts                    # Capa de datos — todas las operaciones CRUD
│
├── types/
│   └── index.ts                 # Tipos TypeScript y configuración de columnas
│
├── hooks/
│   └── useTheme.ts              # Hook para tema claro/oscuro
│
└── utils/
    └── date.ts                  # Utilidades de fecha
```

---

## Modelo de datos (Supabase)

### Tabla `activities` (proyectos)

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | uuid (PK) | Identificador único |
| `user_id` | uuid (FK → auth.users) | Dueño del registro |
| `title` | text | Nombre del proyecto |
| `description` | text | Descripción opcional |
| `due_date` | text | Fecha límite (YYYY-MM-DD) |
| `completed_at` | text | Fecha/hora de finalización |
| `created_at` | text | Fecha/hora de creación |
| `status` | text | Columna actual: `pending`, `thisWeek`, `completed` |
| `position` | integer | Orden dentro de la columna |

### Tabla `tasks`

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | uuid (PK) | Identificador único |
| `user_id` | uuid (FK → auth.users) | Dueño del registro |
| `activity_id` | uuid (FK → activities, nullable) | Proyecto al que pertenece (opcional) |
| `title` | text | Nombre de la tarea |
| `description` | text | Descripción opcional |
| `priority` | text | `low`, `medium`, `high` |
| `due_date` | text | Fecha límite |
| `completed_at` | text | Fecha/hora de finalización |
| `created_at` | text | Fecha/hora de creación |
| `status` | text | Columna actual: `pending`, `thisWeek`, `completed` |
| `position` | integer | Orden dentro de la columna |
| `tags` | text[] | Etiquetas opcionales |

Ambas tablas tienen **Row Level Security (RLS)** activo: cada usuario solo puede leer y escribir sus propios datos.

---

## Configuración local

### 1 — Requisitos

- Node.js 18+
- Cuenta en [Supabase](https://supabase.com)

### 2 — Clonar e instalar

```bash
git clone https://github.com/jose-socola-jdss/kanban-board.git
cd kanban-board
npm install
```

### 3 — Variables de entorno

Crea el archivo `.env.local` en la raíz del proyecto:

```
VITE_SUPABASE_URL=https://<project-id>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-public-key>
```

Los valores se obtienen en Supabase → **Settings → API**.

> `.env.local` está en `.gitignore` y nunca se sube al repositorio.

### 4 — Crear las tablas en Supabase

En el **SQL Editor** de Supabase ejecuta:

```sql
create table public.activities (
  id           uuid primary key,
  user_id      uuid references auth.users(id) on delete cascade not null,
  title        text not null,
  description  text,
  due_date     text,
  completed_at text,
  created_at   text not null,
  status       text not null check (status in ('pending', 'thisWeek', 'completed')),
  position     integer not null default 0
);

create table public.tasks (
  id                  uuid primary key,
  user_id             uuid references auth.users(id) on delete cascade not null,
  activity_id         uuid references public.activities(id) on delete set null,
  title               text not null,
  description         text,
  priority            text not null check (priority in ('low', 'medium', 'high')),
  due_date            text,
  completed_at        text,
  created_at          text not null,
  status              text not null check (status in ('pending', 'thisWeek', 'completed')),
  position            integer not null default 0,
  tags                text[] default array[]::text[],
  scheduling_type     text check (scheduling_type in ('none', 'fixed', 'recurring')),
  recurring_type      text check (recurring_type in ('daily', 'weekly', 'monthly')),
  recurring_week_day  integer,
  recurring_month_day integer,
  recurring_end_date  text,
  scheduled_start     text,
  scheduled_end       text
);

alter table public.activities enable row level security;
alter table public.tasks      enable row level security;

create policy "propietario_activities"
  on public.activities for all
  using      (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "propietario_tasks"
  on public.tasks for all
  using      (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

> **Nota — migraciones para bases de datos existentes:**
> ```sql
> -- 1. Hacer activity_id opcional (si fue creado con NOT NULL)
> alter table public.tasks alter column activity_id drop not null;
> alter table public.tasks
>   drop constraint if exists tasks_activity_id_fkey,
>   add constraint tasks_activity_id_fkey
>     foreign key (activity_id) references public.activities(id) on delete set null;
>
> -- 2. Añadir columnas de programación recurrente
> alter table public.tasks
>   add column if not exists scheduling_type     text check (scheduling_type in ('none', 'fixed', 'recurring')),
>   add column if not exists recurring_type      text check (recurring_type in ('daily', 'weekly', 'monthly')),
>   add column if not exists recurring_week_day  integer,
>   add column if not exists recurring_month_day integer,
>   add column if not exists recurring_end_date  text;
> ```

### 5 — Configurar la URL de redirección en Supabase

En Supabase → **Authentication → URL Configuration**:

- **Site URL:** `https://<tu-dominio>.vercel.app`
- **Redirect URLs:** `https://<tu-dominio>.vercel.app`

Esto es necesario para que los correos de confirmación de cuenta redirijan al dominio correcto.

### 6 — Arrancar en local

```bash
npm run dev
```

Abre `http://localhost:5173`, crea una cuenta y confirma el correo.

---

## Despliegue en Vercel

### Conectar el repositorio

1. Ve a [vercel.com](https://vercel.com) → **Add New Project**
2. Importa el repositorio `jose-socola-jdss/kanban-board` desde GitHub
3. Framework preset: **Vite** (se detecta automáticamente)

### Variables de entorno en Vercel

En **Settings → Environment Variables** añade:

| Variable | Valor |
|---|---|
| `VITE_SUPABASE_URL` | `https://<project-id>.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `<anon-public-key>` |

> ⚠️ Vite bake las variables en el bundle en tiempo de build. Cada vez que cambies una variable en Vercel debes hacer un **Redeploy sin caché** para que tenga efecto.

### Redeploy manual

**Deployments** → tres puntos del último deploy → **Redeploy** → desmarcar *"Use existing Build Cache"*.

---

## Flujo de autenticación

```
Usuario abre la app
    ↓
App verifica sesión con supabase.auth.getSession()
    ↓
¿Sesión activa? → Carga datos del usuario desde Supabase → Muestra el tablero
¿Sin sesión?   → Muestra pantalla de Login
    ↓
Login / Registro con email + contraseña
    ↓
Supabase envía correo de confirmación (solo en el registro)
    ↓
Usuario confirma → sesión activa → tablero
```

---

## Flujo de datos

Cada acción del usuario sigue el patrón **optimistic update**:

1. El estado local (Zustand) se actualiza **inmediatamente** → la UI responde al instante
2. En paralelo, la operación se envía a Supabase en segundo plano
3. En el arranque de la app, los datos se cargan desde Supabase y reemplazan el estado vacío inicial

---

## Scripts disponibles

```bash
npm run dev      # Servidor de desarrollo en localhost:5173
npm run build    # Build de producción (tsc + vite build)
npm run preview  # Previsualizar el build de producción localmente
npm run lint     # Linter ESLint
```

---

## Repositorio y servicios

| Servicio | URL |
|---|---|
| Repositorio GitHub | https://github.com/jose-socola-jdss/kanban-board |
| App en producción | https://kanban-board-ruby-nu.vercel.app |
| Proyecto Supabase | https://supabase.com/dashboard/project/gqxusyvbqljvunmxbjwp |
