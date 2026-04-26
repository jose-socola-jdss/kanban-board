# Kanban — Mi Tablero

Plataforma de productividad personal para gestión de proyectos y tareas con tablero Kanban, calendario, vista general y estadísticas detalladas. Cada proyecto agrupa un conjunto de tareas que avanzan por tres columnas: **Pendientes → Para hoy → Finalizadas**. Al completar todas las tareas de un proyecto se dispara una animación de celebración. Las tareas también pueden crearse de forma independiente, sin asociarlas a ningún proyecto.

**URL de producción:** https://kanban-board-ruby-nu.vercel.app

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| UI | React 18 + TypeScript |
| Estilos | Tailwind CSS |
| Drag & drop | @dnd-kit/core + @dnd-kit/sortable |
| Estado | Zustand (con persistencia en localStorage) |
| Gráficas | Recharts |
| Base de datos | Supabase (PostgreSQL) |
| Autenticación | Supabase Auth (email + contraseña) |
| Build | Vite 5 |
| Deploy | Vercel |
| Repositorio | GitHub |

---

## Funcionalidades principales

### 🗂️ Tablero Kanban
- Tres columnas: **Pendientes**, **Para hoy** y **Finalizadas**
- Drag & drop entre columnas y para reordenar tarjetas
- Tarjetas independientes o asociadas a un proyecto

### 📁 Proyectos
- Cada proyecto agrupa múltiples tareas con barra de progreso
- Al completar todas las tareas de un proyecto, se dispara una animación de celebración
- Vista dedicada con las tarjetas de proyecto y su estado

### ⏱️ Modo "En Progreso"
- Banner en la parte superior del tablero que indica qué tarea está en curso
- Temporizador en tiempo real (cuenta regresiva hasta la hora de fin programada)
- Acciones rápidas: **Finalizar** tarea o enviarla **A la cola**
- El estado de la tarea activa se sincroniza con Supabase mediante etiquetas internas, lo que permite ver la tarea en progreso desde cualquier navegador o dispositivo

### 🕐 Programación de tareas ("Para hoy")
- Selectores de **hora de inicio y fin** directamente en la tarjeta, sin abrir el modal
- Creación de tareas desde la columna "Para hoy" con fecha fijada al día actual
- La tarea activa se resalta visualmente con borde teal y etiqueta "EN CURSO"

### 📅 Calendario
- Vista mensual con chips de tareas por día de entrega, coloreados por prioridad
- Indicador rojo en días con tareas vencidas
- Panel de detalle al hacer clic en un día
- Crear nueva tarea con la fecha del día seleccionado prellenada

### 📋 Vista General
- Lista unificada de todas las tareas y proyectos
- **Búsqueda** por nombre de tarea
- **Filtros**: por estado (pendiente / para hoy / finalizada), prioridad y proyecto
- **Agrupación** por estado, proyecto o prioridad
- **Ordenamiento** por fecha de creación, fecha límite, prioridad o título
- Tarjetas de resumen de proyectos con barra de progreso
- Crear tareas y proyectos directamente desde la vista

### 📊 Estadísticas
- **8 KPIs**: tareas completadas, racha actual de días, completadas esta semana (con comparación vs. semana anterior), promedio diario (30 días), tareas vencidas, en progreso, pendientes, día más productivo
- **Insights automáticos** con mensajes motivacionales basados en tu actividad real
- **Gráfica de barras**: actividad de los últimos 7 días (creadas vs. completadas)
- **Línea de tendencia**: evolución de las últimas 4 semanas
- **Donuts**: distribución por prioridad y por estado
- **Tabla de proyectos** con barra de progreso individual

### 🧭 Barra lateral de navegación
- Sidebar fijo a la izquierda con íconos y tooltips para las cinco vistas
- Acceso a: **Mi Tablero · Proyectos · Vista General · Calendario · Estadísticas**

### 🌙 Tema claro / oscuro
- Toggle en la cabecera — persiste entre sesiones
- Modo claro con fondo azul-gris suave (`#EEF1F7`); modo oscuro con fondo negro puro

### 🔁 Tareas recurrentes
- Tipos: **diaria**, **semanal** (día de la semana) y **mensual** (día del mes)
- Fecha de fin opcional para la recurrencia
- Se reestablecen automáticamente al día siguiente de haberse completado

### ⚡ Actualizaciones optimistas
- El estado local se actualiza inmediatamente en la UI y la operación se envía a Supabase en segundo plano, sin bloquear la interfaz

---

## Estructura del proyecto

```
src/
├── App.tsx                      # Raíz — sesión, sidebar, routing entre vistas y modales globales
├── main.tsx                     # Punto de entrada
├── index.css                    # Estilos globales, tokens CSS y animaciones
├── vite-env.d.ts                # Tipos de variables de entorno Vite
│
├── components/
│   ├── Board.tsx                # Tablero kanban con drag & drop
│   ├── Column.tsx               # Columna individual
│   ├── TaskCard.tsx             # Tarjeta de tarea con selectores de hora y estado activo
│   ├── DragCard.tsx             # Overlay durante el arrastre
│   ├── TaskModal.tsx            # Modal para crear/editar tareas
│   ├── MonthlyBoard.tsx         # Vista de proyectos
│   ├── GoalCard.tsx             # Tarjeta de proyecto
│   ├── GoalDragCard.tsx         # Overlay de proyecto durante arrastre
│   ├── GoalModal.tsx            # Modal para crear/editar proyectos
│   ├── Header.tsx               # Cabecera — alternador Tareas/Proyectos, tema y sesión
│   ├── Sidebar.tsx              # Barra lateral con navegación entre las cinco vistas
│   ├── InProgressBanner.tsx     # Banner "En Progreso" con temporizador y acciones
│   ├── Login.tsx                # Pantalla de login y registro
│   └── ActivityCelebration.tsx  # Animación de celebración al completar proyecto
│
├── pages/
│   ├── OverviewPage.tsx         # Vista General — lista filtrable de tareas y proyectos
│   ├── CalendarPage.tsx         # Vista Calendario — cuadrícula mensual de tareas
│   └── StatsPage.tsx            # Vista Estadísticas — KPIs, gráficas e insights
│
├── store/
│   └── kanbanStore.ts           # Store Zustand — estado + sincronización con Supabase
│
├── lib/
│   ├── supabase.ts              # Cliente Supabase (singleton)
│   └── db.ts                    # Capa de datos — todas las operaciones CRUD
│
├── types/
│   └── index.ts                 # Tipos TypeScript (Task, Activity, ViewMode, etc.)
│
├── hooks/
│   └── useTheme.ts              # Hook para tema claro/oscuro
│
└── utils/
    └── date.ts                  # Utilidades de fecha (fecha local, recurrencia, etc.)
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
| `status` | text | Columna: `pending`, `thisWeek`, `completed` |
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
| `status` | text | Columna: `pending`, `thisWeek`, `completed` |
| `position` | integer | Orden dentro de la columna |
| `tags` | text[] | Etiquetas; también se usan internamente para sincronizar la tarea activa entre dispositivos |
| `scheduling_type` | text | `none`, `fixed`, `recurring` |
| `recurring_type` | text | `daily`, `weekly`, `monthly` |
| `recurring_week_day` | integer | Día de la semana (0=Dom … 6=Sáb) |
| `recurring_month_day` | integer | Día del mes (1-31) |
| `recurring_end_date` | text | Fecha de fin de la recurrencia |
| `scheduled_start` | text | Hora de inicio programada (HH:mm) |
| `scheduled_end` | text | Hora de fin programada (HH:mm) |

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
> -- 2. Añadir columnas de programación recurrente y horaria
> alter table public.tasks
>   add column if not exists scheduling_type     text check (scheduling_type in ('none', 'fixed', 'recurring')),
>   add column if not exists recurring_type      text check (recurring_type in ('daily', 'weekly', 'monthly')),
>   add column if not exists recurring_week_day  integer,
>   add column if not exists recurring_month_day integer,
>   add column if not exists recurring_end_date  text,
>   add column if not exists scheduled_start     text,
>   add column if not exists scheduled_end       text;
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
App verifica sesión con supabase.auth.onAuthStateChange()
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
3. En el arranque de la app, los datos se cargan desde Supabase y reemplazan el estado local

### Sincronización multi-dispositivo del estado activo

El estado "En Progreso" (qué tarea está activa y cuándo inició) se persiste en Supabase mediante una etiqueta interna en el campo `tags` de la tarea (`__ACTIVE_TASK:<timestamp>__`). Esto permite recuperar el estado exacto al abrir la app desde cualquier navegador o dispositivo.

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
