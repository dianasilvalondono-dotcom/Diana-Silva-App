-- ═══════════════════════════════════════════════════════════════
-- Tope diario de la IA por persona y cuentas nuevas sin fecha vencida (SIN APLICAR)
--
-- Decisión de Diana, 21-oct-2026 (ronda-hq/00-direccion/decisiones-semilla.md):
-- 10 mensajes de IA al día por persona, sumando Tu Ronda, la Guía IA de la
-- Comunidad y Crea tu programa; una crisis siempre responde y no gasta cupo.
-- Diseño: ronda-hq/05-producto/ronda-plus-fundadoras-diseno.md (secciones 1.2 y 2).
--
-- Orden para publicar (paso 2 del diseño): aplicar ESTE archivo completo ANTES
-- de desplegar la app que llama a usar_ia. Los endpoints de IA fallan cerrado:
-- sin esta función responden 503 (la IA en pausa, con Ayuda). La app publicada
-- antes no la usa, así que aplicarlo primero no le cambia nada; lo único que
-- se nota es que una cuenta nueva (hasta la 50) ya no nace vencida: aparta su
-- cupo de fundadora sin Ronda+ todavía (en freemium) y la reapertura
-- (reabrir-ronda-plus.sql) se lo da con la misma fecha que a las demás.
--
-- Lo que guarda: solo cuántos mensajes le envía cada persona a la IA cada día
-- de Colombia (user_id, dia, usos, chat, comunidad, programa). Nunca qué
-- escribió ni qué respondió la IA, ni tokens. 90 días y se borra solo (una
-- tarea diaria de pg_cron, sección 6, también cuando nadie usa la IA).
-- Política v1.1, secciones 3.1, 6 y 9 (public/privacidad.html).
--
-- Se puede aplicar más de una vez: create … if not exists, on conflict do
-- nothing, create or replace, drop policy if exists, revoke/grant y
-- cron.schedule con nombre (reemplaza la tarea del mismo nombre).
-- Reversa: tope-ia-y-cuentas-nuevas-reversa.sql.
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Ajustes de Ronda+ (una sola fila) ──
create table if not exists public.ronda_plus_ajustes (
  id boolean primary key default true check (id),
  -- Último momento de Ronda+ incluido para las fundadoras (fin del día en
  -- Colombia). null: las cuentas nuevas nacen en freemium, nunca vencidas.
  -- Lo pone reabrir-ronda-plus.sql (paso 6), no este archivo: Ronda+ se abre
  -- solo cuando la app con el tope ya está publicada.
  fundadoras_hasta timestamptz,
  -- Mensajes de IA por persona y día de Colombia. 0 = la IA en pausa para
  -- todas (la revisión de crisis sigue respondiendo).
  tope_ia_diario integer not null default 10 check (tope_ia_diario between 0 and 200),
  -- Cupos de fundadora ya dados (de los 50). Solo sube: si se borra una
  -- cuenta fundadora (por ejemplo, porque lo pidió por correo), su cupo no
  -- pasa a la cuenta 51 en adelante («las primeras 50 cuentas de Ronda»).
  cupos_fundadora_dados integer not null default 0 check (cupos_fundadora_dados >= 0),
  actualizado_en timestamptz not null default now()
);
-- 10 = decisión de Diana del 21-oct-2026. Si la fila ya existe, no se toca.
insert into public.ronda_plus_ajustes (id, tope_ia_diario) values (true, 10)
on conflict (id) do nothing;
-- El primer día, los cupos dados son las fundadoras que ya existen (36 el
-- 21-oct-2026). greatest: aplicar el archivo otra vez nunca baja la cuenta.
update public.ronda_plus_ajustes a
   set cupos_fundadora_dados = greatest(a.cupos_fundadora_dados,
         (select count(*) from public.profiles p where p.premium_source = 'founding_member'))
 where a.id;
alter table public.ronda_plus_ajustes enable row level security;
-- La app lee el tope para decirlo antes de llegar a él (Perfil, Ley 1480).
-- Nadie lo cambia desde la app: solo el editor SQL (postgres).
revoke all on table public.ronda_plus_ajustes from public, anon, authenticated;
grant select on table public.ronda_plus_ajustes to authenticated;
drop policy if exists "Con sesión se leen los ajustes" on public.ronda_plus_ajustes;
create policy "Con sesión se leen los ajustes" on public.ronda_plus_ajustes
  for select to authenticated using (true);

-- ── 2. Uso diario de la IA, por persona y día de Colombia ──
-- Solo conteos: nunca qué se escribió ni qué respondió la IA.
create table if not exists public.uso_ia_diario (
  user_id uuid not null references auth.users (id) on delete cascade,
  dia date not null,
  usos integer not null default 0 check (usos >= 0),
  chat integer not null default 0 check (chat >= 0),
  comunidad integer not null default 0 check (comunidad >= 0),
  programa integer not null default 0 check (programa >= 0),
  primary key (user_id, dia)
);
-- Para borrar rápido lo que pasa de 90 días (secciones 3 y 6).
create index if not exists uso_ia_diario_dia on public.uso_ia_diario (dia);
alter table public.uso_ia_diario enable row level security;
-- Nadie escribe aquí desde la app: solo la función usar_ia. Cada una puede
-- ver su propio conteo (derecho de acceso, Ley 1581).
revoke all on table public.uso_ia_diario from public, anon, authenticated;
grant select on table public.uso_ia_diario to authenticated;
drop policy if exists "Cada una ve su propio uso" on public.uso_ia_diario;
create policy "Cada una ve su propio uso" on public.uso_ia_diario
  for select to authenticated using ((select auth.uid()) = user_id);

-- ── 3. Borrar los conteos de más de 90 días ──
-- La corre cada día pg_cron (sección 6) y también usar_ia en cada llamada.
-- Devuelve cuántas filas borró (solo el número).
create or replace function public.limpiar_uso_ia()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_borradas integer;
begin
  delete from public.uso_ia_diario
   where dia < (now() at time zone 'America/Bogota')::date - 90;
  get diagnostics v_borradas = row_count;
  return v_borradas;
end;
$$;
revoke execute on function public.limpiar_uso_ia() from public, anon, authenticated;

-- ── 4. Contar un mensaje, solo si queda cupo hoy (una sentencia atómica) ──
-- La llama el servidor (api/_auth.js, exigirTopeIA) con el token de ella,
-- después de la revisión de crisis, de Ronda+ y de la autorización de la IA,
-- y justo antes de pedirle la respuesta a Anthropic. SECURITY DEFINER porque
-- ella no puede escribir la tabla; solo toca su propia fila (auth.uid()) y
-- solo suma 1. Si la llama sola, solo gasta su propio cupo.
-- Varias peticiones a la vez no pasan del tope: insert … on conflict do
-- update … where usos < tope termina siempre en un insert o en un update
-- (https://www.postgresql.org/docs/current/sql-insert.html#SQL-ON-CONFLICT),
-- y el where se vuelve a revisar con la fila ya bloqueada.
-- Devuelve { permitido, usados, tope } o { permitido: false, motivo: 'tope'|'pausa', tope }.
create or replace function public.usar_ia(p_funcion text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_dia date := (now() at time zone 'America/Bogota')::date;
  v_tope integer;
  v_usos integer;
begin
  if v_uid is null then
    raise exception 'usar_ia: sin sesión' using errcode = '42501';
  end if;
  if p_funcion is null or p_funcion not in ('chat', 'comunidad', 'programa') then
    raise exception 'usar_ia: función no válida' using errcode = '22023';
  end if;

  -- Los 90 días también aquí (la tarea diaria de la sección 6 es la principal).
  perform public.limpiar_uso_ia();

  select a.tope_ia_diario into v_tope from public.ronda_plus_ajustes a where a.id;
  if coalesce(v_tope, 0) <= 0 then
    return jsonb_build_object('permitido', false, 'motivo', 'pausa', 'tope', 0);
  end if;

  insert into public.uso_ia_diario as u (user_id, dia, usos, chat, comunidad, programa)
  values (v_uid, v_dia, 1,
          (p_funcion = 'chat')::int, (p_funcion = 'comunidad')::int, (p_funcion = 'programa')::int)
  on conflict (user_id, dia) do update
     set usos      = u.usos + 1,
         chat      = u.chat + excluded.chat,
         comunidad = u.comunidad + excluded.comunidad,
         programa  = u.programa + excluded.programa
   where u.usos < v_tope
  returning u.usos into v_usos;

  if v_usos is null then
    return jsonb_build_object('permitido', false, 'motivo', 'tope', 'tope', v_tope);
  end if;

  return jsonb_build_object('permitido', true, 'usados', v_usos, 'tope', v_tope);
end;
$$;
-- Supabase da EXECUTE a anon y authenticated en cada función nueva: se quita
-- a public y anon; authenticated la necesita (el servidor la llama con el
-- token de ella). Aviso esperado de Supabase: 0029 (SECURITY DEFINER que
-- puede llamar quien tiene sesión), intencional; ver el diseño, 1.2.
revoke execute on function public.usar_ia(text) from public, anon;
grant execute on function public.usar_ia(text) to authenticated;

-- ── 5. Cuentas nuevas: nunca con una fecha vencida ──
-- Hasta hoy la función traía escrita la fecha '2026-07-25 23:59:59+00': desde
-- el 26-jul, toda cuenta nueva entre la 37 y la 50 nacía con Ronda+ vencido.
-- Ahora, mientras queden cupos de los 50 (cupos_fundadora_dados, que solo sube):
--   · con fecha vigente en ronda_plus_ajustes.fundadoras_hasta: nace
--     fundadora con Ronda+ hasta esa fecha (la reapertura pone el 31-mar-2027
--     a las 23:59:59 de Colombia, (date '2027-03-31' + 1)::timestamp at time
--     zone 'America/Bogota' - interval '1 second');
--   · sin fecha, o ya pasada: aparta su cupo (premium_source =
--     'founding_member') sin Ronda+ y sin fecha, es decir, en freemium y
--     nunca vencida. Es la cuenta 37 que llega entre el paso 2 y la
--     reapertura: reabrir-ronda-plus.sql le da la misma fecha que a las demás
--     (decisión de Diana: cuentas 37 a 50 con la misma fecha). Perfil no le
--     muestra la tarjeta de fundadora mientras no tenga fecha.
--   · de la 51 en adelante (50 cupos dados): freemium, sin origen.
-- El trigger auto_grant_premium (BEFORE INSERT en profiles) no cambia: solo se
-- reemplaza su función, así conserva su nombre y su lugar en el orden
-- (a_proteger_premium → a_sellar_autorizacion_perfil → auto_grant_premium).
create or replace function public.grant_founding_member_premium()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hasta timestamptz;
  v_dados integer;
  v_fundadoras integer;
begin
  -- Solo el alta de una cuenta (handle_new_user, sin sesión de usuaria). Si
  -- una usuaria inserta su fila con su sesión, a_proteger_premium ya la dejó
  -- en freemium y aquí no recibe nada.
  if coalesce(auth.role(), '') in ('authenticated', 'anon') then
    return new;
  end if;
  -- Si quien crea la fila ya trae un plan (el panel o service_role), se respeta.
  if new.premium_source is not null then
    return new;
  end if;

  -- Dos cuentas creadas al mismo tiempo no se pasan de los 50 cupos.
  perform pg_advisory_xact_lock(hashtext('ronda_cupos_fundadoras'));
  select a.fundadoras_hasta, a.cupos_fundadora_dados into v_hasta, v_dados
    from public.ronda_plus_ajustes a where a.id;
  select count(*) into v_fundadoras from public.profiles p where p.premium_source = 'founding_member';
  -- Los cupos dados: el contador (no baja si se borra una cuenta) o las
  -- fundadoras que hay hoy, la cifra mayor.
  v_dados := greatest(coalesce(v_dados, 0), v_fundadoras);
  if v_dados >= 50 then
    return new;  -- de la 51 en adelante: freemium, sin origen
  end if;

  new.premium_source := 'founding_member';
  if v_hasta is not null and v_hasta > now() then
    new.is_premium := true;
    new.premium_until := v_hasta;
  else
    -- Sin fecha vigente: aparta su cupo, en freemium y sin fecha (nunca vencida).
    new.is_premium := false;
    new.premium_until := null;
  end if;
  update public.ronda_plus_ajustes a
     set cupos_fundadora_dados = v_dados + 1
   where a.id;
  return new;
end;
$$;
-- Solo la usa el trigger.
revoke execute on function public.grant_founding_member_premium() from public, anon, authenticated;

-- ── 6. El borrado de los 90 días corre cada día, aunque nadie use la IA ──
-- Condición de la Directora Legal para la política v1.1. pg_cron está
-- disponible en el proyecto (list_extensions, 21-oct-2026) pero no instalado:
-- se instala aquí. Corre en UTC: 05:10 UTC son las 00:10 de Colombia.
-- Si pg_cron no se puede instalar, todo el archivo falla y no se aplica nada.
do $$
begin
  if to_regnamespace('cron') is null then
    -- Como lo indica Supabase (https://supabase.com/docs/guides/database/extensions/pg_cron).
    create extension if not exists pg_cron with schema pg_catalog;
    grant usage on schema cron to postgres;
    grant all privileges on all tables in schema cron to postgres;
  end if;
  -- Con nombre: si ya existe una tarea con ese nombre, se reemplaza.
  perform cron.schedule('ronda-limpiar-uso-ia', '10 5 * * *', 'select public.limpiar_uso_ia()');
end
$$;

-- ── 7. Cifras del mes para la CFO: solo agregadas y con umbral ──
-- CLAUDE.md, regla 4: nadie lee tablas base, ni el CTO; solo vistas del
-- esquema metricas con un mínimo de 10 personas por grupo (umbral confirmado
-- por la Directora Legal, 21-oct-2026; política, secciones 3.1 y 10).
create schema if not exists metricas;
revoke all on schema metricas from public, anon, authenticated;
create or replace view metricas.uso_ia_mes with (security_invoker = true) as
select date_trunc('month', dia)::date as mes,
       sum(chat)      as mensajes_chat,
       sum(comunidad) as mensajes_comunidad,
       sum(programa)  as mensajes_programa,
       count(distinct user_id) as personas
  from public.uso_ia_diario
 group by 1
having count(distinct user_id) >= 10;
revoke all on metricas.uso_ia_mes from public, anon, authenticated;

notify pgrst, 'reload schema';
