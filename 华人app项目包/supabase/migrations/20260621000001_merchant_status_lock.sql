-- ============================================================
-- 修复：商家本人可绕过前端改自己的 status 自助过审
-- 1) 自更新策略补 with check，禁止把记录改到别人名下
-- 2) 补管理员更新策略（admin 可审核任意商家）
-- 3) 触发器锁定 status：非 admin 改 status 会被静默还原为原值
-- ============================================================

-- ---- 重建商家更新策略 ----
drop policy if exists "merchants_update_self" on public.merchants;

create policy "merchants_update_self" on public.merchants
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "merchants_update_admin" on public.merchants
  for update
  using (public.is_admin())
  with check (public.is_admin());

-- ---- 锁定 status 列：只有 admin / service_role 能改 ----
create or replace function public.lock_merchant_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from old.status then
    -- auth.uid() 为 null = service_role/后台脚本，放行；否则必须是 admin
    if auth.uid() is not null and not public.is_admin() then
      new.status := old.status;   -- 普通用户（商家本人）对 status 的修改静默忽略
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_lock_merchant_status on public.merchants;
create trigger trg_lock_merchant_status
  before update on public.merchants
  for each row execute function public.lock_merchant_status();
