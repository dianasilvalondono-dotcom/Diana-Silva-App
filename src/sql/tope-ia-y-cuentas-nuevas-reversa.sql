-- ═══════════════════════════════════════════════════════════════
-- Reversa de tope-ia-y-cuentas-nuevas.sql (SIN APLICAR)
--
-- Solo si hiciera falta, y solo con una app SIN el tope en producción: la app
-- con el tope llama a usar_ia y, sin ella, la IA responde 503 (en pausa) a
-- todas. Regla dura del diseño: Ronda+ nunca queda abierto con una app sin el
-- tope; si la reapertura ya corrió, primero reabrir-ronda-plus-reversa.sql.
--
-- Se quedan, a propósito:
--   · ronda_plus_ajustes y la función nueva de grant_founding_member_premium:
--     volver a la de antes es volver a crear cuentas vencidas (fecha fija
--     '2026-07-25 23:59:59+00'). Sin fecha en los ajustes, hasta la 50
--     apartan su cupo en freemium y de la 51 en adelante nacen en freemium.
--   · la extensión pg_cron (sin tareas de Ronda, no hace nada).
--   · el esquema metricas (vacío o con otras vistas).
-- Se puede correr más de una vez.
-- ═══════════════════════════════════════════════════════════════

-- 1. La tarea diaria de los 90 días.
do $$
begin
  if to_regclass('cron.job') is not null
     and exists (select 1 from cron.job where jobname = 'ronda-limpiar-uso-ia') then
    perform cron.unschedule('ronda-limpiar-uso-ia');
  end if;
end
$$;

-- 2. El conteo: la vista depende de la tabla, va antes.
drop view if exists metricas.uso_ia_mes;
drop function if exists public.usar_ia(text);
drop function if exists public.limpiar_uso_ia();
-- Los conteos se borran con la tabla (son solo números).
drop table if exists public.uso_ia_diario;

notify pgrst, 'reload schema';
