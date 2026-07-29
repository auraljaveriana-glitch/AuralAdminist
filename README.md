# Aural · Panel de administración de citas

Panel para que tu equipo (Eduardo, Camilo, Yurani, etc.) vea y gestione las citas
de las 10 sedes y 17 audiólogos de Aural. Conectado a Supabase, listo para
desplegar en Netlify — el mismo stack que ya usas.

## 1. Configurar Supabase

1. Ve a tu proyecto en [supabase.com](https://supabase.com) (o crea uno nuevo).
2. Abre **SQL Editor → New query**, pega el contenido completo de `schema.sql`
   y ejecútalo. Esto crea las tablas: `sedes`, `audiologos`,
   `horarios_disponibles`, `bloqueos`, `pacientes`, `citas`.
3. Borra los datos de ejemplo al final del archivo y carga tus 10 sedes reales
   y tus 17 audiólogos (puedes hacerlo desde **Table Editor** directamente,
   fila por fila, o con un `insert` en el SQL Editor).
4. Ve a **Authentication → Users** y crea una cuenta para cada persona de tu
   equipo que vaya a usar el panel (correo + contraseña). Este panel usa
   autenticación por correo/contraseña — no hay registro público, solo tú
   das de alta a la gente desde ahí.
5. Ve a **Settings → API** y copia:
   - `Project URL` → esta es tu `VITE_SUPABASE_URL`
   - `anon public` key → esta es tu `VITE_SUPABASE_ANON_KEY`

## 2. Correrlo en tu computadora (para probar)

```bash
npm install
cp .env.example .env
# edita .env y pega tu URL y anon key
npm run dev
```

Abre `http://localhost:5173` e inicia sesión con una de las cuentas que
creaste en el paso 1.4.

## 3. Desplegar en Netlify

1. Sube esta carpeta a un repositorio de GitHub (o arrastra la carpeta
   directamente en Netlify si prefieres deploy manual).
2. En Netlify: **Add new site → Import an existing project**.
3. Build command: `npm run build` — Publish directory: `dist`
4. En **Site settings → Environment variables**, agrega:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Deploy. Listo — tu equipo entra desde el link de Netlify e inicia sesión.

## Qué hace el panel (v1)

- **Login** con Supabase Auth (solo tu equipo, sin registro público).
- **Filtro por sede** en la barra lateral, con conteo de citas de hoy.
- **Filtros** por audiólogo, estado (pendiente/confirmada/cancelada/
  completada/no asistió) y rango de fechas.
- **Lista de citas agrupada por día**, ordenada por hora.
- **Crear cita manual**: busca o crea el paciente automáticamente por
  teléfono, valida que el audiólogo esté libre a esa hora (no deja doble
  reservar).
- **Acciones rápidas**: confirmar, cancelar, editar.

## Lo que falta para la v2 (cuando quieras seguir)

- **Página pública de reserva**: la que el paciente ve cuando le llega el
  link por WhatsApp (elige sede → audiólogo → horario disponible → confirma).
  Esta v1 es solo el panel interno; la pública es el siguiente bloque.
- **Cálculo de horarios disponibles** a partir de `horarios_disponibles` y
  `bloqueos` (la tabla ya existe en el esquema, falta la función que cruza
  disponibilidad real contra citas ya tomadas).
- **Webhook a n8n**: cuando se crea o cambia el estado de una cita, disparar
  la notificación de WhatsApp (puedes usar Supabase **Database Webhooks** —
  Database → Webhooks — apuntando a tu URL de n8n, se configura sin código).
- **Vista de calendario** (hoy es lista agrupada por día; una vista tipo
  calendario semanal es posible más adelante si el equipo la prefiere).
- **Permisos por sede**: hoy cualquier cuenta ve todas las sedes; se puede
  restringir para que cada coordinador solo vea su sede.

## Estructura del proyecto

```
aural-admin/
├── schema.sql              → esquema completo de Supabase
├── .env.example             → plantilla de variables de entorno
├── src/
│   ├── supabaseClient.js    → conexión a Supabase
│   ├── App.jsx               → lógica principal (sesión, datos, filtros)
│   ├── index.css             → sistema de diseño del panel
│   └── components/
│       ├── Login.jsx
│       ├── Sidebar.jsx
│       ├── FiltersBar.jsx
│       ├── CitasList.jsx
│       ├── CitaModal.jsx
│       └── Waveform.jsx      → elemento visual de marca
```
