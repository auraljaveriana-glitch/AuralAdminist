-- ============================================================
-- AURAL · Actualizar horario base general
-- Lunes a Jueves: 7:30 AM - 5:00 PM
-- Viernes: 7:30 AM - 4:30 PM
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- 1. Borra el horario recurrente actual de TODOS los audiólogos
delete from horarios_disponibles;

-- 2. Lunes a jueves (dia_semana 1,2,3,4): 7:30 AM - 5:00 PM
insert into horarios_disponibles (audiologo_id, dia_semana, hora_inicio, hora_fin, duracion_cita_min)
select a.id, dia, '07:30', '17:00', 30
from audiologos a, generate_series(1, 4) as dia;

-- 3. Viernes (dia_semana 5): 7:30 AM - 4:30 PM
insert into horarios_disponibles (audiologo_id, dia_semana, hora_inicio, hora_fin, duracion_cita_min)
select a.id, 5, '07:30', '16:30', 30
from audiologos a;

-- ============================================================
-- Verificación: deberías ver 5 filas por cada audiólogo
-- (4 de lunes-jueves + 1 de viernes) = 17 audiólogos × 5 = 85 filas
-- ============================================================
select count(*) as total_horarios from horarios_disponibles;

-- Detalle por audiólogo, para confirmar que quedó bien
select au.nombre as audiologo, hd.dia_semana, hd.hora_inicio, hd.hora_fin
from horarios_disponibles hd
join audiologos au on au.id = hd.audiologo_id
order by au.nombre, hd.dia_semana;
