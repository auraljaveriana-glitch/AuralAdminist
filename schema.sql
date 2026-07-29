-- ============================================================
-- AURAL · Sistema de Agendamiento
-- Esquema de base de datos para Supabase (Postgres)
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- 1. SEDES (las 10 ubicaciones de Aural)
create table sedes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,                -- ej: "Aural Cali - Norte"
  ciudad text not null,
  direccion text,
  telefono text,
  activa boolean default true,
  creado_en timestamptz default now()
);

-- 2. AUDIÓLOGOS (los 17 profesionales)
create table audiologos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  sede_id uuid references sedes(id) on delete restrict,
  especialidad text,                   -- ej: "Adaptación auditiva", "Diagnóstico"
  telefono text,
  email text,
  activo boolean default true,
  creado_en timestamptz default now()
);

-- 3. HORARIOS RECURRENTES (disponibilidad semanal base por audiólogo)
create table horarios_disponibles (
  id uuid primary key default gen_random_uuid(),
  audiologo_id uuid references audiologos(id) on delete cascade,
  dia_semana int not null check (dia_semana between 0 and 6), -- 0=domingo ... 6=sábado
  hora_inicio time not null,
  hora_fin time not null,
  duracion_cita_min int default 30,    -- tamaño de cada slot (minutos)
  creado_en timestamptz default now()
);

-- 4. BLOQUEOS (excepciones: vacaciones, incapacidades, días festivos específicos)
create table bloqueos (
  id uuid primary key default gen_random_uuid(),
  audiologo_id uuid references audiologos(id) on delete cascade,
  fecha date not null,
  hora_inicio time,                    -- null = todo el día
  hora_fin time,
  motivo text,
  creado_en timestamptz default now()
);

-- 5. PACIENTES
create table pacientes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  telefono text not null,              -- formato E.164, ej: 573001234567
  email text,
  documento text,                      -- cédula, opcional
  creado_en timestamptz default now()
);

create index idx_pacientes_telefono on pacientes(telefono);

-- 6. CITAS
create table citas (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid references pacientes(id) on delete restrict,
  audiologo_id uuid references audiologos(id) on delete restrict,
  sede_id uuid references sedes(id) on delete restrict,
  fecha date not null,
  hora_inicio time not null,
  hora_fin time not null,
  estado text not null default 'pendiente'
    check (estado in ('pendiente', 'confirmada', 'cancelada', 'completada', 'no_asistio')),
  motivo_consulta text,                -- ej: "Chequeo gratuito", "Control", "Adaptación"
  notas text,
  notificacion_enviada boolean default false, -- para que n8n sepa si ya mandó WhatsApp
  creado_en timestamptz default now(),
  actualizado_en timestamptz default now()
);

create index idx_citas_fecha on citas(fecha);
create index idx_citas_audiologo on citas(audiologo_id, fecha);
create index idx_citas_sede on citas(sede_id, fecha);

-- Evita doble reserva del mismo audiólogo en el mismo horario
create unique index idx_no_doble_reserva
  on citas(audiologo_id, fecha, hora_inicio)
  where estado not in ('cancelada');

-- Trigger para actualizar 'actualizado_en' automáticamente
create or replace function actualizar_timestamp()
returns trigger as $$
begin
  new.actualizado_en = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_citas_actualizado
before update on citas
for each row execute function actualizar_timestamp();

-- ============================================================
-- ROW LEVEL SECURITY
-- El panel de admin usa Supabase Auth. Los datos solo se leen/escriben
-- por usuarios autenticados (tu equipo). El formulario público de
-- reserva (fase 2) usará una función RPC con permisos limitados,
-- no acceso directo a las tablas.
-- ============================================================

alter table sedes enable row level security;
alter table audiologos enable row level security;
alter table horarios_disponibles enable row level security;
alter table bloqueos enable row level security;
alter table pacientes enable row level security;
alter table citas enable row level security;

-- Política: cualquier usuario autenticado (tu equipo) puede leer y escribir todo
-- (más adelante puedes restringir por sede si quieres permisos por sucursal)
create policy "Equipo autenticado - lectura total"
  on sedes for select using (auth.role() = 'authenticated');
create policy "Equipo autenticado - lectura total"
  on audiologos for select using (auth.role() = 'authenticated');
create policy "Equipo autenticado - lectura total"
  on horarios_disponibles for select using (auth.role() = 'authenticated');
create policy "Equipo autenticado - lectura total"
  on bloqueos for select using (auth.role() = 'authenticated');
create policy "Equipo autenticado - lectura total"
  on pacientes for all using (auth.role() = 'authenticated');
create policy "Equipo autenticado - lectura total"
  on citas for all using (auth.role() = 'authenticated');

create policy "Equipo autenticado - escritura sedes"
  on sedes for all using (auth.role() = 'authenticated');
create policy "Equipo autenticado - escritura audiologos"
  on audiologos for all using (auth.role() = 'authenticated');
create policy "Equipo autenticado - escritura horarios"
  on horarios_disponibles for all using (auth.role() = 'authenticated');
create policy "Equipo autenticado - escritura bloqueos"
  on bloqueos for all using (auth.role() = 'authenticated');

-- ============================================================
-- DATOS DE EJEMPLO (borra esto y carga tus 10 sedes / 17 audiólogos reales)
-- ============================================================

insert into sedes (nombre, ciudad) values
  ('Aural Cali - Norte', 'Cali'),
  ('Aural Cali - Sur', 'Cali');

-- Ejemplo de un audiólogo (repite el patrón para los 17 reales)
insert into audiologos (nombre, sede_id, especialidad)
select 'Dra. Ejemplo', id, 'Diagnóstico auditivo'
from sedes where nombre = 'Aural Cali - Norte';

-- Ejemplo de horario recurrente: Lunes a Viernes 8am-5pm, citas de 30 min
insert into horarios_disponibles (audiologo_id, dia_semana, hora_inicio, hora_fin, duracion_cita_min)
select a.id, dia, '08:00', '17:00', 30
from audiologos a, generate_series(1,5) as dia
where a.nombre = 'Dra. Ejemplo';
