-- ============================================================
-- AURAL · Vista "citas_detalle"
-- Aparece en Supabase → Table Editor, en la sección "Views"
-- (junto a las tablas normales, pero con un ícono distinto).
-- Se puede ver, filtrar y ordenar igual que una tabla — solo que
-- no se puede editar directamente ahí (para eso sigues usando el
-- panel de administración o la tabla `citas` real).
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- ============================================================

create or replace view citas_detalle as
select
  c.id,
  c.fecha,
  c.hora_inicio,
  c.hora_fin,
  c.estado,
  c.motivo_consulta,
  c.notas,
  p.nombre as paciente_nombre,
  p.telefono as paciente_telefono,
  p.email as paciente_email,
  p.eps as paciente_eps,
  a.nombre as audiologo,
  s.nombre as sede,
  s.ciudad,
  c.creado_en
from citas c
join pacientes p on p.id = c.paciente_id
join audiologos a on a.id = c.audiologo_id
join sedes s on s.id = c.sede_id;

-- Le da a tu equipo (usuarios autenticados del panel) permiso de
-- leer esta vista
grant select on citas_detalle to authenticated;
