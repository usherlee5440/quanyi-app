-- ============================================================
-- 全藝 NEXT U — Supabase 完整建置腳本（SQL Editor 整份貼上執行；可重複執行，不會覆蓋既有資料）
-- 安全原則：點數/經驗/角色/名人堂狀態「只能透過下方 RPC 函式」修改，
-- 前端用戶不能直接 UPDATE，避免教練自己改點數、一般用戶自己變管理者。
-- ============================================================

-- 1) 資料表 ---------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  role        text not null default 'student' check (role in ('student','coach','admin')),
  full_name   text,
  phone       text,
  avatar_url  text,
  created_at  timestamptz not null default now()
);

create sequence if not exists public.coach_code_seq start 1;

create table if not exists public.coach_profiles (
  id               uuid primary key references public.profiles(id) on delete cascade,
  coach_code       text not null unique,                      -- 例: 'ch-08'
  rank_tier        text not null default 'rookie' check (rank_tier in ('rookie','junior','senior','partner')),
  current_exp      integer not null default 0 check (current_exp >= 0),
  training_points  integer not null default 0 check (training_points >= 0),
  total_hours      integer not null default 0 check (total_hours >= 0),
  status           text not null default 'active' check (status in ('active','retired','terminated')),
  subdomain_url    text,
  line_official_id text,
  updated_at       timestamptz not null default now()
);
alter table public.coach_profiles add column if not exists updated_at timestamptz not null default now();

create table if not exists public.points_ledger (                           -- 只新增的流水帳
  id              uuid primary key default gen_random_uuid(),
  coach_id        uuid not null references public.coach_profiles(id) on delete cascade,
  amount_fee      integer not null default 0,                 -- 回繳規費 100/200/300
  points_earned   integer not null default 0,                 -- 發放點數（解鎖技能為負數）
  exp_earned      integer not null default 0,
  description     text,
  created_at      timestamptz not null default now()
);
create index if not exists points_ledger_coach_created_idx on public.points_ledger (coach_id, created_at desc);

-- 技能目錄（你的規格外新增：伺服端需要費用與門檻才能驗證解鎖）
create table if not exists public.skill_catalog (
  id       text primary key,
  name     text not null,
  cost     integer not null,
  min_rank text not null check (min_rank in ('rookie','junior','senior','partner')),
  requires text references public.skill_catalog(id)
);
insert into public.skill_catalog values
  ('performance_choreography','表演編排',300,'rookie',null),
  ('market_bd','市場開發',800,'junior','performance_choreography'),
  ('social_marketing','社群行銷',1500,'junior','market_bd'),
  ('business_mgmt','經營管理',3000,'senior',null)
on conflict (id) do nothing;

create table if not exists public.skill_tree_unlocks (
  id          uuid primary key default gen_random_uuid(),
  coach_id    uuid not null references public.coach_profiles(id) on delete cascade,
  skill_id    text not null references public.skill_catalog(id),
  unlocked_at timestamptz not null default now(),
  unique (coach_id, skill_id)
);

-- 2) 輔助函式 -------------------------------------------------
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') $$;

create or replace function public.rank_idx(r text) returns int
language sql immutable as
$$ select array_position(array['rookie','junior','senior','partner'], r) $$;

-- 新用戶註冊 → 自動建立 profile（角色一律 student，教練/管理者需由管理者指派）
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, phone, avatar_url)
  values (new.id,
          coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
          new.phone,
          coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture'));
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- 3) 名人堂去識別化 -------------------------------------------
-- 現役：全名；退役：姓+教練；交惡：代號。退役/交惡不回傳 coach_code，避免被反查。
-- 歷史教學時數三種狀態都保留。
create or replace function public.get_hall_of_fame()
returns table (coach_code text, display_name text, total_hours integer, show_profile boolean, rank_tier text)
language sql stable security definer set search_path = public as $$
  select case when cp.status = 'active' then cp.coach_code end,
         case cp.status
           when 'active'  then p.full_name
           when 'retired' then left(p.full_name, 1) || '教練'
           else '代號 ' || upper(cp.coach_code)
         end,
         cp.total_hours, cp.status = 'active', cp.rank_tier
  from public.coach_profiles cp join public.profiles p on p.id = cp.id
  order by cp.total_hours desc
$$;

-- 名人堂 View：包裝上面的函式，安全地對外公開（可用 supabase.from('hall_of_fame') 查詢）
create or replace view public.hall_of_fame as select * from public.get_hall_of_fame();
grant select on public.hall_of_fame to anon, authenticated;

-- 4) 事務函式（RPC）-------------------------------------------
-- 教練新增過手費 → 寫帳本 + 加點數/經驗 + 自動升階（同一交易，for update 鎖列防重複請求）
create or replace function public.add_lesson_fee(p_description text default null)
returns public.coach_profiles
language plpgsql security definer set search_path = public as $$
declare
  c public.coach_profiles; v_fee int; v_exp int := 50; v_new_exp int; v_rank text;
begin
  select * into c from public.coach_profiles where id = auth.uid() for update;
  if not found then raise exception '你不是教練'; end if;
  if c.status <> 'active' then raise exception '帳號非現役，無法新增課務'; end if;

  v_fee := case c.rank_tier when 'rookie' then 300 when 'junior' then 200 when 'senior' then 100 else 0 end;
  v_new_exp := c.current_exp + v_exp;
  v_rank := case when v_new_exp >= 20000 then 'partner' when v_new_exp >= 6000 then 'senior'
                 when v_new_exp >= 1500 then 'junior' else 'rookie' end;
  if public.rank_idx(v_rank) < public.rank_idx(c.rank_tier) then v_rank := c.rank_tier; end if; -- 只升不降

  insert into public.points_ledger (coach_id, amount_fee, points_earned, exp_earned, description)
  values (c.id, v_fee, v_fee, v_exp, coalesce(p_description, '課務回繳'));   -- 點數 1:1

  update public.coach_profiles
     set training_points = training_points + v_fee, current_exp = v_new_exp, rank_tier = v_rank,
         total_hours = total_hours + 1, updated_at = now()
   where id = c.id returning * into c;
  return c;
end $$;

-- 技能解鎖：伺服端驗證階級/前置/點數，再扣點
create or replace function public.unlock_skill(p_skill_id text)
returns public.coach_profiles
language plpgsql security definer set search_path = public as $$
declare c public.coach_profiles; s public.skill_catalog;
begin
  select * into c from public.coach_profiles where id = auth.uid() for update;
  if not found then raise exception '你不是教練'; end if;
  select * into s from public.skill_catalog where id = p_skill_id;
  if not found then raise exception '找不到此技能'; end if;
  if exists (select 1 from public.skill_tree_unlocks where coach_id = c.id and skill_id = s.id) then raise exception '已解鎖'; end if;
  if public.rank_idx(c.rank_tier) < public.rank_idx(s.min_rank) then raise exception '階級未達'; end if;
  if s.requires is not null and not exists
     (select 1 from public.skill_tree_unlocks where coach_id = c.id and skill_id = s.requires) then raise exception '需先解鎖前置技能'; end if;
  if c.training_points < s.cost then raise exception '點數不足'; end if;

  insert into public.skill_tree_unlocks (coach_id, skill_id) values (c.id, s.id);
  insert into public.points_ledger (coach_id, points_earned, description) values (c.id, -s.cost, '解鎖技能：' || s.name);
  update public.coach_profiles set training_points = training_points - s.cost where id = c.id returning * into c;
  return c;
end $$;

-- 管理者專用：指派角色（指派 coach 時自動建立 coach_profiles 與編號）
create or replace function public.admin_set_role(p_user uuid, p_role text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception '權限不足'; end if;
  if p_role not in ('student','coach','admin') then raise exception '角色無效'; end if;
  update public.profiles set role = p_role where id = p_user;
  if p_role = 'coach' then
    insert into public.coach_profiles (id, coach_code)
    values (p_user, 'ch-' || lpad(nextval('public.coach_code_seq')::text, 2, '0'))
    on conflict (id) do nothing;
  end if;
end $$;

-- 管理者專用：切換教練狀態（名人堂顯示即時跟著改變）
create or replace function public.admin_set_coach_status(p_coach uuid, p_status text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception '權限不足'; end if;
  if p_status not in ('active','retired','terminated') then raise exception '狀態無效'; end if;
  update public.coach_profiles set status = p_status where id = p_coach;
end $$;

-- 管理者營運總覽
create or replace function public.admin_overview() returns json
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception '權限不足'; end if;
  return (select json_build_object(
    'fees_total', coalesce(sum(amount_fee), 0),
    'fees_this_month', coalesce(sum(amount_fee) filter (where created_at >= date_trunc('month', now())), 0),
    'fees_last_month', coalesce(sum(amount_fee) filter (where created_at >= date_trunc('month', now()) - interval '1 month'
                                                          and created_at <  date_trunc('month', now())), 0),
    'coaches_active', (select count(*) from public.coach_profiles where status = 'active'),
    'coaches_total',  (select count(*) from public.coach_profiles)
  ) from public.points_ledger);
end $$;
revoke execute on function public.admin_overview() from public, anon;
grant  execute on function public.admin_overview() to authenticated;

-- 5) 權限與 RLS -----------------------------------------------
alter table public.profiles           enable row level security;
alter table public.coach_profiles     enable row level security;
alter table public.points_ledger      enable row level security;
alter table public.skill_catalog      enable row level security;
alter table public.skill_tree_unlocks enable row level security;

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select using (id = auth.uid() or public.is_admin());
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy coach_select  on public.coach_profiles     for select using (id = auth.uid() or public.is_admin());
drop policy if exists ledger_select on public.points_ledger;
create policy ledger_select on public.points_ledger      for select using (coach_id = auth.uid() or public.is_admin());
drop policy if exists unlock_select on public.skill_tree_unlocks;
create policy unlock_select on public.skill_tree_unlocks for select using (coach_id = auth.uid() or public.is_admin());
drop policy if exists catalog_select on public.skill_catalog;
create policy catalog_select on public.skill_catalog     for select to authenticated using (true);

-- 資料表層級：前端只能讀；profiles 只能改自己的名字/電話/頭像（不含 role）
revoke all on public.profiles, public.coach_profiles, public.points_ledger,
              public.skill_catalog, public.skill_tree_unlocks from anon, authenticated;
grant select on public.profiles, public.coach_profiles, public.points_ledger,
                public.skill_catalog, public.skill_tree_unlocks to authenticated;
grant update (full_name, phone, avatar_url) on public.profiles to authenticated;

-- 函式預設任何人可執行，需手動收回
revoke execute on function public.add_lesson_fee(text), public.unlock_skill(text),
  public.admin_set_role(uuid, text), public.admin_set_coach_status(uuid, text) from public, anon;
grant execute on function public.add_lesson_fee(text), public.unlock_skill(text),
  public.admin_set_role(uuid, text), public.admin_set_coach_status(uuid, text) to authenticated;
grant execute on function public.get_hall_of_fame() to anon, authenticated;

-- 6) 第一位管理者：先用 Google 登入一次，再於 SQL Editor 手動執行（換成你的 email）：
-- update public.profiles set role = 'admin'
--  where id = (select id from auth.users where email = 'you@example.com');
