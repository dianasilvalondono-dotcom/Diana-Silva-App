-- ═══════════════════════════════════════════════════════════════
-- Reversa de reabrir-ronda-plus.sql (SIN APLICAR)
--
-- Ronda+ de las fundadoras vuelve a como estaba antes de la reapertura y las
-- cuentas nuevas vuelven a nacer en freemium. El tope de la IA no cambia.
-- Solo toca a las fundadoras (premium_source = 'founding_member') que siguen
-- con la fecha de la reapertura: si alguien les cambió la fecha después, se
-- quedan con esa.
-- Se puede correr más de una vez: la segunda vez no cambia nada.
-- Cuándo: si la reapertura sale mal, o antes de cualquier Instant Rollback de
-- Vercel a una app sin el tope (Ronda+ nunca queda abierto sin el tope).
-- ═══════════════════════════════════════════════════════════════
do $$
declare
  v_hasta timestamptz;
  v_devueltas integer;
  v_cerradas integer;
begin
  if to_regclass('public.ronda_plus_ajustes') is null or to_regclass('public.ronda_plus_respaldo') is null then
    raise notice 'No hay reapertura aplicada: no se cambió nada.';
    return;
  end if;
  select a.fundadoras_hasta into v_hasta from public.ronda_plus_ajustes a where a.id;
  if v_hasta is null then
    raise notice 'No hay reapertura vigente: no se cambió nada.';
    return;
  end if;

  -- 1. Las cuentas nuevas vuelven a nacer en freemium, sin fecha.
  update public.ronda_plus_ajustes set fundadoras_hasta = null, actualizado_en = now() where id;

  -- 2. Cada fundadora del respaldo vuelve a su valor anterior, si nadie le
  --    cambió la fecha después. Si su valor anterior era futuro (nació durante
  --    una reapertura anterior), su Ronda+ termina hoy.
  update public.profiles p
     set is_premium = r.is_premium_antes,
         premium_until = case when r.premium_until_antes > now() then now() else r.premium_until_antes end
    from public.ronda_plus_respaldo r
   where p.id = r.user_id
     and p.premium_source = 'founding_member'
     and p.premium_until = v_hasta;
  get diagnostics v_devueltas = row_count;

  -- 3. Las que nacieron durante la reapertura (no están en el respaldo): su
  --    Ronda+ termina hoy.
  update public.profiles p
     set premium_until = now()
   where p.premium_source = 'founding_member'
     and p.premium_until = v_hasta
     and not exists (select 1 from public.ronda_plus_respaldo r where r.user_id = p.id);
  get diagnostics v_cerradas = row_count;

  raise notice 'Reversa: % fundadoras con su fecha anterior y % cuentas nuevas cerradas hoy.', v_devueltas, v_cerradas;
end
$$;
-- El respaldo se borra aparte, cuando Diana confirme que ya no hace falta:
-- drop table if exists public.ronda_plus_respaldo;
