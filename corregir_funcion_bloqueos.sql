-- ============================================================
-- AURAL · Corrección: la función de disponibilidad pública ahora
-- SÍ resta los bloqueos (día completo o por horas) de la tabla
-- `bloqueos`. Antes esta tabla existía pero no se estaba usando.
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
-- ============================================================

create or replace function horarios_disponibles_publico(
  p_audiologo_id uuid,
  p_fecha date
)
returns table (hora_inicio time, hora_fin time)
language plpgsql
security definer
set search_path = public
as $BODY$
declare
  v_dia_semana int;
begin
  v_dia_semana := extract(dow from p_fecha);

  -- Si hay un bloqueo de DÍA COMPLETO (sin hora) para este audiólogo en
  -- esta fecha, no hay ningún horario disponible ese día.
  if exists (
    select 1 from bloqueos
    where audiologo_id = p_audiologo_id
      and fecha = p_fecha
      and hora_inicio is null
  ) then
    return;
  end if;

  if exists (
    select 1 from horarios_fecha
    where audiologo_id = p_audiologo_id and fecha = p_fecha
  ) then
    return query
    with rangos as (
      select hf.hora_inicio as r_inicio, hf.hora_fin as r_fin, hf.duracion_cita_min as dur
      from horarios_fecha hf
      where hf.audiologo_id = p_audiologo_id and hf.fecha = p_fecha
    ),
    slots as (
      select
        (r_inicio + (n * (dur || ' minutes')::interval))::time as slot_inicio,
        (r_inicio + ((n+1) * (dur || ' minutes')::interval))::time as slot_fin
      from rangos,
        generate_series(0, (extract(epoch from (r_fin - r_inicio)) / 60 / dur)::int - 1) as n
    )
    select slot_inicio, slot_fin
    from slots
    where slot_fin <= (select r_fin from rangos limit 1)
      and not exists (
        select 1 from citas c
        where c.audiologo_id = p_audiologo_id
          and c.fecha = p_fecha
          and c.hora_inicio = slots.slot_inicio
          and c.estado <> 'cancelada'
      )
      and not exists (
        select 1 from bloqueos b
        where b.audiologo_id = p_audiologo_id
          and b.fecha = p_fecha
          and b.hora_inicio is not null
          and slots.slot_inicio >= b.hora_inicio
          and slots.slot_inicio < b.hora_fin
      )
    order by slot_inicio;
  else
    return query
    with rangos as (
      select hd.hora_inicio as r_inicio, hd.hora_fin as r_fin, hd.duracion_cita_min as dur
      from horarios_disponibles hd
      where hd.audiologo_id = p_audiologo_id and hd.dia_semana = v_dia_semana
    ),
    slots as (
      select
        (r_inicio + (n * (dur || ' minutes')::interval))::time as slot_inicio,
        (r_inicio + ((n+1) * (dur || ' minutes')::interval))::time as slot_fin
      from rangos,
        generate_series(0, (extract(epoch from (r_fin - r_inicio)) / 60 / dur)::int - 1) as n
    )
    select slot_inicio, slot_fin
    from slots
    where not exists (
      select 1 from citas c
      where c.audiologo_id = p_audiologo_id
        and c.fecha = p_fecha
        and c.hora_inicio = slots.slot_inicio
        and c.estado <> 'cancelada'
    )
    and not exists (
      select 1 from bloqueos b
      where b.audiologo_id = p_audiologo_id
        and b.fecha = p_fecha
        and b.hora_inicio is not null
        and slots.slot_inicio >= b.hora_inicio
        and slots.slot_inicio < b.hora_fin
    )
    order by slot_inicio;
  end if;
end;
$BODY$;

grant execute on function horarios_disponibles_publico(uuid, date) to anon;
