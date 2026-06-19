drop policy if exists "authenticated_public_insert_evaluation_responses" on public.evaluation_responses;

create policy "authenticated_public_insert_evaluation_responses"
on public.evaluation_responses for insert
to authenticated
with check (true);

drop policy if exists "public_insert_evaluation_responses" on public.evaluation_responses;

create policy "public_insert_evaluation_responses"
on public.evaluation_responses for insert
to anon
with check (true);
