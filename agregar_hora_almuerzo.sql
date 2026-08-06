-- ============================================================
-- AURAL · Agregar hora de almuerzo (12:00 PM - 1:00 PM)
-- Aplica a todas las sedes EXCEPTO Usaquén (sigue de corrido)
-- y EXCEPTO Javeriana (usa su propio calendario por fecha, sin tocar)
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- 1. Borra el horario recurrente actual de todos MENOS Usaquén y Javeriana
delete from horarios_disponibles
where audiologo_id in (
  select a.id
  from audiologos a
  join sedes s on s.id = a.sede_id
  where s.nombre not in ('Aural Usaquén', 'Aural Javeriana')
);

-- 2. Lunes a jueves, bloque de la mañana: 7:30 AM - 12:00 PM
insert into horarios_disponibles (audiologo_id, dia_semana, hora_inicio, hora_fin, duracion_cita_min)
select a.id, dia, '07:30', '12:00', 30
from audiologos a
join sedes s on s.id = a.sede_id,
  generate_series(1, 4) as dia
where s.nombre not in ('Aural Usaquén', 'Aural Javeriana');

-- 3. Lunes a jueves, bloque de la tarde: 1:00 PM - 5:00 PM
insert into horarios_disponibles (audiologo_id, dia_semana, hora_inicio, hora_fin, duracion_cita_min)
select a.id, dia, '13:00', '17:00', 30
from audiologos a
join sedes s on s.id = a.sede_id,
  generate_series(1, 4) as dia
where s.nombre not in ('Aural Usaquén', 'Aural Javeriana');

-- 4. Viernes, bloque de la mañana: 7:30 AM - 12:00 PM
insert into horarios_disponibles (audiologo_id, dia_semana, hora_inicio, hora_fin, duracion_cita_min)
select a.id, 5, '07:30', '12:00', 30
from audiologos a
join sedes s on s.id = a.sede_id
where s.nombre not in ('Aural Usaquén', 'Aural Javeriana');

-- 5. Viernes, bloque de la tarde: 1:00 PM - 4:30 PM
insert into horarios_disponibles (audiologo_id, dia_semana, hora_inicio, hora_fin, duracion_cita_min)
select a.id, 5, '13:00', '16:30', 30
from audiologos a
join sedes s on s.id = a.sede_id
where s.nombre not in ('Aural Usaquén', 'Aural Javeriana');

-- ============================================================
-- Verificación: revisa que Usaquén NO tenga el corte de almuerzo,
-- y que las demás sedes (menos Javeriana) sí lo tengan
-- ============================================================
select s.nombre as sede, au.nombre as audiologo, hd.dia_semana, hd.hora_inicio, hd.hora_fin
from horarios_disponibles hd
join audiologos au on au.id = hd.audiologo_id
join sedes s on s.id = au.sede_id
order by s.nombre, au.nombre, hd.dia_semana, hd.hora_inicio;
