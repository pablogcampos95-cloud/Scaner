drop policy if exists "public_insert_result_once" on public.resultados;

create policy "public_insert_result_once"
on public.resultados for insert
to anon
with check (true);
