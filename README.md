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
- Switch rápido entre vista de Tareas y Proyectos en la cabecera

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
- Panel de detalle al hacer clic en un día con botones para **Crear nueva tarea** o **Crear nuevo proyecto** con la fecha seleccionada

### 📋 Vista General
- Lista unificada de todas las tareas y proyectos con **edición directa** al hacer clic en cualquier fila
- **Acciones rápidas**: Botón de eliminar (papelera) visible al hacer hover en cada tarea
- **Acciones en masa**: Selección múltiple de tareas para mover de columna o eliminar en lote
- **Búsqueda** por nombre de tarea
- **Filtros**: por estado, prioridad y proyecto
- **Agrupación y Ordenamiento** avanzado

### 📊 Estadísticas
- **8 KPIs**: tareas completadas, racha actual de días, completadas esta semana, promedio diario, etc.
- **Insights automáticos** con mensajes motivacionales basados en tu actividad real
- **Gráficas detalladas**: actividad semanal, tendencia mensual y distribución por prioridad/estado

### 🧭 Barra lateral de navegación (Colapsable)
- Sidebar colapsable para maximizar el espacio de trabajo
- Unificación de controles: **Modo claro/oscuro** y **Cerrar sesión** integrados en la barra lateral para acceso constante
- Acceso a: **Mi Tablero · Vista General · Calendario · Estadísticas**

### 🌙 Tema claro / oscuro
- Persiste entre sesiones
- Diseño minimalista con efectos de glassmorphism y gradientes suaves

### 🔁 Tareas recurrentes
- Tipos: **diaria**, **semanal** y **mensual**
- Se reestablecen automáticamente al día siguiente de haberse completado

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
│   ├── Sidebar.tsx              # Barra lateral colapsable con navegación y controles
│   ├── TaskCard.tsx             # Tarjeta de tarea con selectores de hora
│   ├── TaskModal.tsx            # Modal de edición de tareas
│   ├── Header.tsx               # Cabecera del tablero
│   └── ...                      # Otros componentes UI (Celebraciones, Modales de Proyecto, etc.)
│
├── pages/
│   ├── OverviewPage.tsx         # Vista General con acciones en masa y filtros
│   ├── CalendarPage.tsx         # Vista Calendario interactiva
│   └── StatsPage.tsx            # Dashboard de estadísticas e insights
│
├── store/
│   └── kanbanStore.ts           # Estado global y sincronización con Supabase
│
└── lib/
    ├── db.ts                    # Operaciones CRUD en base de datos
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
| `status` | text | Columna: `pending`, `thisWeek`, `completed` |

### Tabla `tasks`

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | uuid (PK) | Identificador único |
| `user_id` | uuid (FK) | Dueño del registro |
| `title` | text | Nombre de la tarea |
| `status` | text | Columna: `pending`, `thisWeek`, `completed` |
| `tags` | text[] | Incluye la sincronización del estado activo (`__ACTIVE_TASK:<timestamp>__`) |
| `scheduled_start` | text | Hora de inicio programada |
| `scheduled_end` | text | Hora de fin programada |

---

## Configuración local

1. **Instalar dependencias**: `npm install`
2. **Configurar .env.local**: Añadir `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`
3. **Base de datos**: Ejecutar el esquema SQL proporcionado en el SQL Editor de Supabase
4. **Ejecutar**: `npm run dev`

---

## Repositorio y servicios

| Servicio | URL |
|---|---|
| Repositorio GitHub | https://github.com/jose-socola-jdss/kanban-board |
| App en producción | https://kanban-board-ruby-nu.vercel.app |
| Proyecto Supabase | https://supabase.com/dashboard/project/gqxusyvbqljvunmxbjwp |
