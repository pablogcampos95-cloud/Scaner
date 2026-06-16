alter table public.resultados add column if not exists ai_suggestion text;
alter table public.resultados add column if not exists ai_suggestion_generated_at timestamp with time zone;

select pg_notify('pgrst', 'reload schema');
