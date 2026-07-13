-- ─────────────────────────────────────────────────────────────────────────────
-- Persistent, cross-instance rate limiting (12 Jul 2026).
--
-- WHY: the in-memory limiter in src/lib/rateLimit.ts lives per serverless
-- instance — on Vercel several instances run in parallel and each keeps its
-- own counter, so "5 orders / 10 min" was only best-effort. This table +
-- atomic function make the counter shared and restart-proof.
--
-- The code (src/lib/rateLimit.ts serverRateLimited) falls back to the
-- in-memory limiter until this file is run — nothing breaks either way.
--
-- SECURITY: service-role only. RLS is enabled with NO policies, and EXECUTE
-- is revoked from anon/authenticated — browsers can neither read nor spoof it.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.rate_limits (
  key          text primary key,
  count        integer not null default 0,
  window_start timestamptz not null default now()
);

alter table public.rate_limits enable row level security;
-- (no policies on purpose — only the service role, which bypasses RLS, may touch it)

-- One atomic upsert per hit: resets the window when it has elapsed, otherwise
-- increments. Returns TRUE when the caller is over the limit.
create or replace function public.rate_limit_hit(
  p_key text,
  p_max integer,
  p_window_seconds integer
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now     timestamptz := now();
  v_limited boolean;
begin
  insert into rate_limits as rl (key, count, window_start)
  values (p_key, 1, v_now)
  on conflict (key) do update
    set count = case
          when rl.window_start <= v_now - make_interval(secs => p_window_seconds)
          then 1 else rl.count + 1 end,
        window_start = case
          when rl.window_start <= v_now - make_interval(secs => p_window_seconds)
          then v_now else rl.window_start end
  returning count > p_max into v_limited;

  -- Opportunistic cleanup so the table never grows unbounded (cheap: only
  -- runs on ~1% of hits, deletes rows idle for over a day).
  if random() < 0.01 then
    delete from rate_limits where window_start < v_now - interval '1 day';
  end if;

  return v_limited;
end;
$$;

revoke all on table public.rate_limits from public, anon, authenticated;
revoke execute on function public.rate_limit_hit(text, integer, integer) from public, anon, authenticated;
