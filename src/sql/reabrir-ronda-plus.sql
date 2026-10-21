-- ═══════════════════════════════════════════════════════════════
-- Ronda+ vuelve para las fundadoras hasta el 31-mar-2027 a las 23:59 de Colombia (SIN APLICAR)
--
-- Decisión de Diana, 21-oct-2026 (ronda-hq/00-direccion/decisiones-semilla.md):
-- Ronda+ para las fundadoras hasta el 31-mar-2027 a las 23:59 de Colombia; las
-- cuentas 37 a 50 con la misma fecha; de la 51 en adelante, freemium.
-- Diseño: ronda-hq/05-producto/ronda-plus-fundadoras-diseno.md, sección 3.
--
-- Cuándo (paso 6 del diseño, tercer «sí» de Diana): después de
-- tope-ia-y-cuentas-nuevas.sql (paso 2), de la app con el tope publicada
-- (paso 4) y del límite de gasto en la consola de Anthropic (paso 5).
-- Lo que el bloque revisa solo (si falta algo, no cambia nada): el tope
-- aplicado y mayor que 0, la fecha en rango y no más de 50 fundadoras. Lo que
-- no puede revisar, y confirma el CTO antes del «sí»: que rondahub.com ya
-- sirve la app con el tope.
--
-- Cómo: con apply_migration (nombre reabrir_ronda_plus_fundadoras, una sola
-- transacción) o en el editor SQL como postgres. Nunca con la sesión de una
-- usuaria: el trigger a_proteger_premium desharía el cambio.
--
-- Solo toca a las fundadoras (premium_source = 'founding_member'). Se puede
-- correr más de una vez: solo alarga, nunca acorta. Con la misma fecha, la
-- segunda vez no cambia nada. Reversa: reabrir-ronda-plus-reversa.sql.
-- ═══════════════════════════════════════════════════════════════

-- Respaldo para la reversa: cómo estaba cada fundadora antes de la primera reapertura.
create table if not exists public.ronda_plus_respaldo (
  user_id uuid primary key references auth.users (id) on delete cascade,
  is_premium_antes boolean not null,
  premium_until_antes timestamptz,
  guardado_en timestamptz not null default now()
);
alter table public.ronda_plus_respaldo enable row level security;
revoke all on table public.ronda_plus_respaldo from public, anon, authenticated;
-- Nadie lo lee desde la app (la regla existe para que no quede una tabla sin reglas).
drop policy if exists "Nadie desde la app" on public.ronda_plus_respaldo;
create policy "Nadie desde la app" on public.ronda_plus_respaldo
  for select to authenticated using (false);

do $$
declare
  -- ÚNICO valor: último día de Ronda+ incluido (decisión de Diana, 21-oct-2026).
  v_dia date := date '2027-03-31';
  v_hasta timestamptz;
  v_tope integer;
  v_fundadoras integer;
  v_cambiadas integer;
  v_pendientes integer;
begin
  -- Termina a las 23:59:59 de ese día en Colombia: 2027-03-31 → 2027-04-01 04:59:59+00.
  v_hasta := ((v_dia + 1)::timestamp at time zone 'America/Bogota') - interval '1 second';
  if v_hasta < now() + interval '7 days' or v_hasta > now() + interval '13 months' then
    raise exception 'La fecha % está fuera de rango (entre 7 días y 13 meses). No se cambió nada.', v_hasta;
  end if;

  -- El tope de la IA va ANTES de reabrir (decisión de Diana).
  if to_regclass('public.ronda_plus_ajustes') is null or to_regprocedure('public.usar_ia(text)') is null then
    raise exception 'Falta el tope diario de la IA (tope-ia-y-cuentas-nuevas.sql). No se cambió nada.';
  end if;
  select a.tope_ia_diario into v_tope from public.ronda_plus_ajustes a where a.id;
  if coalesce(v_tope, 0) < 1 then
    raise exception 'El tope diario de la IA está en 0 o no existe. No se cambió nada.';
  end if;

  select count(*) into v_fundadoras from public.profiles where premium_source = 'founding_member';
  if v_fundadoras > 50 then
    raise exception 'Hay % fundadoras y el máximo es 50. No se cambió nada.', v_fundadoras;
  end if;

  -- Las que todavía no tienen Ronda+ vigente hasta esa fecha.
  insert into public.ronda_plus_respaldo (user_id, is_premium_antes, premium_until_antes)
  select id, is_premium, premium_until
    from public.profiles
   where premium_source = 'founding_member'
     and (premium_until is null or premium_until < v_hasta or is_premium is distinct from true)
  on conflict (user_id) do nothing;

  -- greatest: si alguna ya tenía una fecha más lejana, se queda con la suya.
  update public.profiles
     set is_premium = true, premium_until = greatest(coalesce(premium_until, v_hasta), v_hasta)
   where premium_source = 'founding_member'
     and (premium_until is null or premium_until < v_hasta or is_premium is distinct from true);
  get diagnostics v_cambiadas = row_count;

  -- Las cuentas nuevas (hasta la 50) nacen fundadoras hasta la misma fecha
  -- (grant_founding_member_premium lee esta fila). Solo alarga.
  update public.ronda_plus_ajustes
     set fundadoras_hasta = v_hasta, actualizado_en = now()
   where id and (fundadoras_hasta is null or fundadoras_hasta < v_hasta);

  -- Se revisa solo: si una fundadora quedó sin Ronda+ vigente, no queda nada.
  select count(*) into v_pendientes
    from public.profiles
   where premium_source = 'founding_member'
     and not coalesce(is_premium and premium_until >= v_hasta, false);
  if v_pendientes > 0 then
    raise exception 'Quedaron % fundadoras sin Ronda+ vigente. No se cambió nada.', v_pendientes;
  end if;

  raise notice 'Ronda+ hasta %: % fundadoras, % cambiadas ahora.', v_hasta, v_fundadoras, v_cambiadas;
end
$$;
