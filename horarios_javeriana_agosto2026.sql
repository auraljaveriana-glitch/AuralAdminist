-- ============================================================
-- AURAL JAVERIANA · Turnos rotativos AM/PM por fecha específica
-- Agosto 2026 — Viviana, Carolina, Angela
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- 1. TABLA NUEVA: horarios por fecha específica
-- Esta tabla tiene prioridad sobre horarios_disponibles (el horario
-- semanal recurrente) para los audiólogos que la usen. Sirve para
-- turnos rotativos que no siguen un patrón fijo semana a semana.
create table if not exists horarios_fecha (
  id uuid primary key default gen_random_uuid(),
  audiologo_id uuid references audiologos(id) on delete cascade,
  fecha date not null,
  hora_inicio time not null,
  hora_fin time not null,
  duracion_cita_min int default 30,
  creado_en timestamptz default now()
);

create index if not exists idx_horarios_fecha on horarios_fecha(audiologo_id, fecha);

alter table horarios_fecha enable row level security;

create policy "Equipo autenticado - horarios_fecha"
  on horarios_fecha for all using (auth.role() = 'authenticated');

-- 2. Renombra los 3 audiólogos de marcador de posición en Javeriana
-- (si ya los habías renombrado tú manualmente en Table Editor,
-- borra o ajusta estas 3 líneas para que no sobreescriban tu cambio)
update audiologos set nombre = 'Viviana'  where nombre = 'Audiólogo 1 - Javeriana';
update audiologos set nombre = 'Carolina' where nombre = 'Audiólogo 2 - Javeriana';
update audiologos set nombre = 'Angela'   where nombre = 'Audiólogo 3 - Javeriana';

-- 3. Quita el horario semanal recurrente genérico para estos 3
-- (Javeriana usa el calendario rotativo en su lugar, no L-J/V fijo)
delete from horarios_disponibles
where audiologo_id in (
  select id from audiologos where nombre in ('Viviana', 'Carolina', 'Angela')
);

-- 4. Carga el calendario rotativo de agosto 2026
-- AM = 07:30–13:00 · PM (L-J) = 13:00–17:00 · PM (V) = 13:00–16:30

insert into horarios_fecha (audiologo_id, fecha, hora_inicio, hora_fin)
select a.id, v.fecha::date, v.hora_inicio::time, v.hora_fin::time
from (values
  -- Semana 1
  ('Viviana',  '2026-08-03', '07:30', '13:00'),
  ('Carolina', '2026-08-03', '13:00', '17:00'),
  ('Angela',   '2026-08-04', '13:00', '17:00'),
  ('Viviana',  '2026-08-05', '07:30', '13:00'),
  ('Carolina', '2026-08-05', '13:00', '17:00'),
  ('Angela',   '2026-08-06', '13:00', '17:00'),
  -- Viernes 7 = FESTIVO (no se carga nadie)

  -- Semana 2
  ('Viviana',  '2026-08-10', '07:30', '13:00'),
  ('Carolina', '2026-08-11', '07:30', '13:00'),
  ('Angela',   '2026-08-11', '13:00', '17:00'),
  ('Viviana',  '2026-08-12', '07:30', '13:00'),
  ('Carolina', '2026-08-13', '07:30', '13:00'),
  ('Angela',   '2026-08-13', '13:00', '17:00'),
  ('Viviana',  '2026-08-14', '13:00', '16:30'),

  -- Semana 3 (Lunes 17 = FESTIVO)
  ('Carolina', '2026-08-18', '07:30', '13:00'),
  ('Angela',   '2026-08-18', '13:00', '17:00'),
  ('Viviana',  '2026-08-19', '13:00', '17:00'),
  ('Carolina', '2026-08-20', '07:30', '13:00'),
  ('Angela',   '2026-08-21', '07:30', '13:00'),
  ('Viviana',  '2026-08-21', '13:00', '16:30'),

  -- Semana 4
  ('Carolina', '2026-08-24', '07:30', '13:00'),
  ('Angela',   '2026-08-25', '07:30', '13:00'),
  ('Viviana',  '2026-08-25', '13:00', '17:00'),
  ('Carolina', '2026-08-26', '13:00', '17:00'),
  ('Angela',   '2026-08-27', '07:30', '13:00'),
  ('Viviana',  '2026-08-27', '13:00', '17:00'),
  ('Carolina', '2026-08-28', '13:00', '16:30'),

  -- Semana 5
  ('Angela',   '2026-08-31', '07:30', '13:00')
) as v(nombre, fecha, hora_inicio, hora_fin)
join audiologos a on a.nombre = v.nombre;

-- ============================================================
-- Verificación: revisa que quedó como en el calendario
-- ============================================================
select a.nombre as audiologo, hf.fecha, hf.hora_inicio, hf.hora_fin
from horarios_fecha hf
join audiologos a on a.id = hf.audiologo_id
order by hf.fecha, a.nombre;
