alter table public.resultados add column if not exists review_status text default 'completo';
alter table public.resultados add column if not exists review_type text;
alter table public.resultados add column if not exists reviewed_by uuid references public.profiles(id);
alter table public.resultados add column if not exists reviewed_at timestamp with time zone;
alter table public.resultados add column if not exists ai_review_summary text;
alter table public.resultados add column if not exists final_score numeric;
alter table public.resultados add column if not exists automatic_score numeric;
alter table public.resultados add column if not exists manual_score numeric;
alter table public.resultados add column if not exists has_pending_review boolean default false;
alter table public.resultados add column if not exists pending_review_count integer default 0;

alter table public.evaluation_responses add column if not exists auto_score numeric;
alter table public.evaluation_responses add column if not exists manual_score numeric;
alter table public.evaluation_responses add column if not exists ai_score numeric;
alter table public.evaluation_responses add column if not exists final_score numeric;
alter table public.evaluation_responses add column if not exists review_observation text;
alter table public.evaluation_responses add column if not exists improvement_opportunity text;
alter table public.evaluation_responses add column if not exists review_status text;
alter table public.evaluation_responses add column if not exists reviewed_at timestamp with time zone;
