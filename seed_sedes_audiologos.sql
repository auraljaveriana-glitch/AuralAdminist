-- ============================================================
-- AURAL · Carga de sedes y audiólogos reales
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
--
-- IMPORTANTE: si ya corriste el schema.sql original con los datos
-- de ejemplo ("Aural Cali - Norte", "Dra. Ejemplo"), primero borra
-- esos datos de prueba con esto:
--
--   delete from citas;
--   delete from horarios_disponibles;
--   delete from audiologos;
--   delete from sedes;
--
-- Luego corre todo este archivo de una sola vez.
-- ============================================================

-- 1. SEDES (las 10 reales)
insert into sedes (nombre, ciudad) values
  ('Aural Centenario', 'Cali'),
  ('Aural Tequendama', 'Cali'),
  ('Aural Poblado', 'Medellín'),
  ('Aural Bocagrande', 'Cartagena'),
  ('Aural Parque Washington', 'Barranquilla'),
  ('Aural Plaza Central', 'Bogotá'),
  ('Aural Nuestro Bogotá', 'Bogotá'),
  ('Aural Javeriana', 'Bogotá'),
  ('Aural Villa del Río', 'Bogotá'),
  ('Aural Usaquén', 'Bogotá');

-- 2. AUDIÓLOGOS (17 en total, con nombres de marcador de posición)
-- Renómbralos después en Supabase → Table Editor → audiologos
-- (basta con editar la celda "nombre" de cada fila)

insert into audiologos (nombre, sede_id, especialidad)
select 'Audiólogo 1 - Centenario', id, 'Diagnóstico auditivo'
from sedes where nombre = 'Aural Centenario';

insert into audiologos (nombre, sede_id, especialidad)
select 'Audiólogo 1 - Tequendama', id, 'Diagnóstico auditivo'
from sedes where nombre = 'Aural Tequendama';

insert into audiologos (nombre, sede_id, especialidad)
select 'Audiólogo 1 - Poblado', id, 'Diagnóstico auditivo'
from sedes where nombre = 'Aural Poblado';

insert into audiologos (nombre, sede_id, especialidad)
select 'Audiólogo 1 - Bocagrande', id, 'Diagnóstico auditivo'
from sedes where nombre = 'Aural Bocagrande';

insert into audiologos (nombre, sede_id, especialidad)
select 'Audiólogo 1 - Parque Washington', id, 'Diagnóstico auditivo'
from sedes where nombre = 'Aural Parque Washington';

-- Plaza Central: 3 audiólogos
insert into audiologos (nombre, sede_id, especialidad)
select v.nombre, s.id, 'Diagnóstico auditivo'
from sedes s, (values
  ('Audiólogo 1 - Plaza Central'),
  ('Audiólogo 2 - Plaza Central'),
  ('Audiólogo 3 - Plaza Central')
) as v(nombre)
where s.nombre = 'Aural Plaza Central';

insert into audiologos (nombre, sede_id, especialidad)
select 'Audiólogo 1 - Nuestro Bogotá', id, 'Diagnóstico auditivo'
from sedes where nombre = 'Aural Nuestro Bogotá';

-- Javeriana: 3 audiólogos
insert into audiologos (nombre, sede_id, especialidad)
select v.nombre, s.id, 'Diagnóstico auditivo'
from sedes s, (values
  ('Audiólogo 1 - Javeriana'),
  ('Audiólogo 2 - Javeriana'),
  ('Audiólogo 3 - Javeriana')
) as v(nombre)
where s.nombre = 'Aural Javeriana';

insert into audiologos (nombre, sede_id, especialidad)
select 'Audiólogo 1 - Villa del Río', id, 'Diagnóstico auditivo'
from sedes where nombre = 'Aural Villa del Río';

-- Usaquén: 4 audiólogos
insert into audiologos (nombre, sede_id, especialidad)
select v.nombre, s.id, 'Diagnóstico auditivo'
from sedes s, (values
  ('Audiólogo 1 - Usaquén'),
  ('Audiólogo 2 - Usaquén'),
  ('Audiólogo 3 - Usaquén'),
  ('Audiólogo 4 - Usaquén')
) as v(nombre)
where s.nombre = 'Aural Usaquén';

-- 3. HORARIOS RECURRENTES para todos (Lunes a Viernes 8am-5pm, citas de 30 min)
-- Ajusta esto después por audiólogo si alguno tiene horario distinto
-- (ej. sábados, medio tiempo, etc.)
insert into horarios_disponibles (audiologo_id, dia_semana, hora_inicio, hora_fin, duracion_cita_min)
select a.id, dia, '08:00', '17:00', 30
from audiologos a, generate_series(1, 5) as dia;

-- ============================================================
-- Verificación rápida: deberías ver 10 sedes y 17 audiólogos
-- ============================================================
select
  (select count(*) from sedes) as total_sedes,
  (select count(*) from audiologos) as total_audiologos;

-- Detalle por sede, para confirmar que cuadra con tu lista
select s.nombre as sede, s.ciudad, count(a.id) as num_audiologos
from sedes s
left join audiologos a on a.sede_id = s.id
group by s.nombre, s.ciudad
order by s.ciudad, s.nombre;
