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
- Switch rápido entre vista de **Tareas** y **Proyectos** en la cabecera

### 📁 Proyectos
- Cada proyecto agrupa múltiples tareas con barra de progreso
- Al completar todas las tareas de un proyecto, se dispara una animación de celebración
- Vista dedicada con las tarjetas de proyecto y su estado

### ⏱️ Modo "En Progreso"
- Banner en la parte superior del tablero que indica qué tarea está en curso
- Temporizador en tiempo real (cuenta regresiva hasta la hora de fin programada)
- Acciones rápidas: **Detener**, **Finalizar** tarea o enviarla **A la cola**
- **A la cola** reordena la tarea activa al final de **Para hoy** y detiene la sesión actual, sin iniciar otra automáticamente
- El estado se sincroniza con Supabase para mantenerse en cualquier navegador o dispositivo

### 🕐 Programación de tareas ("Para hoy")
- Selectores de **hora de inicio y fin** directamente en la tarjeta
- La tarea activa se resalta visualmente con borde teal y etiqueta "EN CURSO"

### 🔄 Auto-promoción a "Para hoy" al iniciar sesión
Al cargar la app, el sistema evalúa automáticamente qué tareas deben estar en la columna **Para hoy** y las mueve sin intervención manual. Solo se evalúan las tareas que están en **Pendientes**:

| Tipo de tarea | Condición |
|---|---|
| Recurrente **diaria** | Siempre se mueve al día actual |
| Recurrente **semanal** | Si el día de la semana configurado coincide con hoy |
| Recurrente **mensual** | Si el día del mes configurado coincide con hoy |
| Fecha **fija** | Si `dueDate == hoy` |
| Sin tipo / normal | Si `dueDate ≤ hoy` (vencidas o del día) |

Las tareas recurrentes con `recurringEndDate` ya vencida se ignoran. Las que ya están en "Para hoy" o "Finalizadas" no se tocan.

### 📅 Calendario interactivo
- Vista mensual con chips de tareas por día de entrega, coloreados por prioridad
- **Hover en cada día**: aparecen botones rápidos para **Crear tarea** (ícono `+`) y **Crear proyecto** (ícono carpeta), sin necesidad de hacer clic primero
- **Chips clickeables**: hacer clic en cualquier tarea del calendario abre el modal de edición directamente
- Indicador rojo en días con tareas vencidas
- Panel de detalle al hacer clic en un día, con acceso a editar cada tarea desde ahí

### 📋 Vista General
- Lista unificada de todas las tareas y proyectos con **edición directa** al hacer clic en cualquier fila
- **Eliminar al hacer hover**: ícono de papelera visible al pasar el cursor
- **Acciones en masa**: selección múltiple para mover de columna o eliminar tareas en lote
- **Búsqueda**, **filtros**, **agrupación** y **ordenamiento** avanzados
- La agrupación por defecto organiza las tareas por tipo de programación: **Sin fecha**, **Fecha fija** y **Programación especial**

### 📊 Estadísticas
- **8 KPIs**: tareas completadas, racha de días, comparativa semanal, promedio diario, tareas vencidas, etc.
- **Insights automáticos** con mensajes motivacionales según tu actividad real
- **Gráficas**: actividad diaria, tendencia semanal y distribución por prioridad/estado

### 🧭 Barra lateral colapsable
- Sidebar fijo a la izquierda con íconos y tooltips para las cuatro vistas
- **Botón de colapsar/expandir** para maximizar el espacio de trabajo
- Controles unificados en la sidebar: **Modo claro/oscuro** (Sol/Luna) y **Cerrar sesión** (LogOut)
- Acceso a: **Mi Tablero · Vista General · Calendario · Estadísticas**

### 🌙 Tema claro / oscuro
- Controlado desde la barra lateral — persiste entre sesiones
- Modo oscuro con fondo negro puro y gradientes sutiles; modo claro con fondo azul-gris suave

### 🔁 Tareas recurrentes
- Tipos: **diaria**, **semanal** y **mensual**
- Se reestablecen automáticamente al día siguiente de haberse completado

### 🗓️ Programaciones especiales avanzadas
- Misma fecha todos los años
- Primer o ultimo dia de cada mes
- Primer lunes y ultimo viernes de cada mes
- Cada **X** dias, semanas o meses
- Ajuste al dia habil anterior o siguiente (con domingo y feriados como no habiles)
- Base de datos de **feriados por usuario** para afectar esos ajustes

### ⚡ Actualizaciones optimistas
- El estado local se actualiza inmediatamente y la operación se envía a Supabase en segundo plano

---

## Estructura del proyecto

```
src/
├── App.tsx                      # Raíz — sesión, sidebar, routing y modales globales
├── main.tsx                     # Punto de entrada
├── index.css                    # Estilos globales y animaciones
│
├── components/
│   ├── Board.tsx                # Tablero kanban con lógica de arrastre
│   ├── Sidebar.tsx              # Barra lateral colapsable (nav + tema + logout)
│   ├── Header.tsx               # Cabecera del tablero (solo switch Tareas/Proyectos)
│   ├── TaskCard.tsx             # Tarjeta de tarea con selectores de hora
│   ├── TaskModal.tsx            # Modal de edición de tareas
│   ├── GoalModal.tsx            # Modal de edición de proyectos
│   ├── InProgressBanner.tsx     # Banner "En Progreso" con temporizador
│   ├── Login.tsx                # Pantalla de login y registro
│   └── ActivityCelebration.tsx  # Animación al completar un proyecto
│
├── pages/
│   ├── OverviewPage.tsx         # Vista General con selección en masa y edición directa
│   ├── CalendarPage.tsx         # Calendario con hover, chips clickeables y edición inline
│   └── StatsPage.tsx            # Dashboard de estadísticas e insights
│
├── store/
│   └── kanbanStore.ts           # Estado global y sincronización con Supabase
│
└── lib/
    ├── db.ts                    # Operaciones CRUD
    └── supabase.ts              # Configuración del cliente Supabase
```

---

## Modelo de datos (Supabase)

### Tabla `activities` (proyectos)

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | uuid (PK) | Identificador único |
| `user_id` | uuid (FK) | Dueño del registro |
| `title` | text | Nombre del proyecto |
| `status` | text | `pending`, `thisWeek`, `completed` |
| `position` | integer | Orden dentro de la columna |

### Tabla `tasks`

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | uuid (PK) | Identificador único |
| `user_id` | uuid (FK) | Dueño del registro |
| `title` | text | Nombre de la tarea |
| `priority` | text | `low`, `medium`, `high` |
| `status` | text | `pending`, `thisWeek`, `completed` |
| `tags` | text[] | Incluye estado activo interno (`__ACTIVE_TASK:<ts>__`) |
| `scheduled_start` / `scheduled_end` | text | Hora de inicio y fin programada |
| `scheduling_type` | text | `none`, `fixed`, `recurring` |

---

## Configuración local

1. **Instalar**: `npm install`
2. **Crear `.env.local`** con `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`
3. **Base de datos**: Ejecutar el esquema SQL en Supabase SQL Editor
4. **Ejecutar**: `npm run dev` → abre `http://localhost:5173`

### Migracion adicional de feriados

Aplica tambien el archivo `supabase/migrations/20260501_add_holidays.sql` para habilitar la vista de **Feriados** y los ajustes por dia habil en programaciones especiales.

---

## Despliegue en Vercel

1. Importar el repositorio desde GitHub
2. Framework preset: **Vite** (auto-detectado)
3. Añadir variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en Settings
4. Cada push a `main` despliega automáticamente

---

## Repositorio y servicios

| Servicio | URL |
|---|---|
| Repositorio GitHub | https://github.com/jose-socola-jdss/kanban-board |
| App en producción | https://kanban-board-ruby-nu.vercel.app |
| Proyecto Supabase | https://supabase.com/dashboard/project/gqxusyvbqljvunmxbjwp |
