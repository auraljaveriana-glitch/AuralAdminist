-- ============================================================
-- AURAL · Reserva pública (sin login)
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query
--
-- Estrategia de seguridad:
-- El público (rol "anon") NO tiene acceso directo de lectura/escritura
-- a pacientes ni citas. En vez de eso, usa dos funciones (RPC) que
-- corren con permisos elevados por dentro, pero solo devuelven o
-- aceptan exactamente lo necesario — nunca datos de otros pacientes.
-- ============================================================

-- 1. Permitir que el público vea sedes y audiólogos activos (info no sensible)
create policy "Público puede ver sedes activas"
  on sedes for select
  to anon
  using (activa = true);

create policy "Público puede ver audiólogos activos"
  on audiologos for select
  to anon
  using (activo = true);

-- ============================================================
-- 2. FUNCIÓN: calcular horarios disponibles de un audiólogo en una fecha
-- ============================================================
create or replace function horarios_disponibles_publico(
  p_audiologo_id uuid,
  p_fecha date
)
returns table (hora_inicio time, hora_fin time)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dia_semana int;
  v_duracion int;
begin
  v_dia_semana := extract(dow from p_fecha);

  -- Si hay un horario específico para esa fecha exacta (horarios_fecha),
  -- ese manda sobre el horario semanal recurrente.
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
    order by slot_inicio;
  else
    -- Si no hay excepción para esa fecha, usa el horario semanal recurrente
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
    order by slot_inicio;
  end if;
end;
$$;

-- Nota: los bloqueos (tabla `bloqueos`) por vacaciones/incapacidades no se
-- están restando todavía en esta primera versión de la función. Si un
-- audiólogo tiene un bloqueo ese día, hoy la función seguiría mostrando
-- sus horarios normales. Podemos sumar esa validación después si la necesitas.

grant execute on function horarios_disponibles_publico(uuid, date) to anon;

-- ============================================================
-- 3. FUNCIÓN: crear una cita desde la página pública
-- ============================================================
create or replace function crear_cita_publica(
  p_sede_id uuid,
  p_audiologo_id uuid,
  p_fecha date,
  p_hora_inicio time,
  p_nombre text,
  p_telefono text,
  p_motivo text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_paciente_id uuid;
  v_hora_fin time;
  v_duracion int;
  v_cita_id uuid;
begin
  -- Busca o crea el paciente por teléfono
  select id into v_paciente_id from pacientes where telefono = p_telefono;
  if v_paciente_id is null then
    insert into pacientes (nombre, telefono) values (p_nombre, p_telefono)
    returning id into v_paciente_id;
  end if;

  -- Determina la duración del espacio (de horarios_fecha si existe, si no de horarios_disponibles)
  select duracion_cita_min into v_duracion
  from horarios_fecha
  where audiologo_id = p_audiologo_id and fecha = p_fecha
  limit 1;

  if v_duracion is null then
    select duracion_cita_min into v_duracion
    from horarios_disponibles
    where audiologo_id = p_audiologo_id and dia_semana = extract(dow from p_fecha)
    limit 1;
  end if;

  v_duracion := coalesce(v_duracion, 30);
  v_hora_fin := p_hora_inicio + (v_duracion || ' minutes')::interval;

  -- Intenta crear la cita. Si el horario ya fue tomado, el índice único
  -- de la tabla citas lanza un error que atrapamos aquí abajo.
  insert into citas (paciente_id, audiologo_id, sede_id, fecha, hora_inicio, hora_fin, motivo_consulta, estado)
  values (v_paciente_id, p_audiologo_id, p_sede_id, p_fecha, p_hora_inicio, v_hora_fin, p_motivo, 'pendiente')
  returning id into v_cita_id;

  return v_cita_id;

exception
  when unique_violation then
    raise exception 'Ese horario ya fue tomado por otra persona. Por favor elige otro.';
end;
$$;

grant execute on function crear_cita_publica(uuid, uuid, date, time, text, text, text) to anon;
