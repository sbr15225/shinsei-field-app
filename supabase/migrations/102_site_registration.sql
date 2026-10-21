-- [2026-10-15] 現場の住所の初回登録（退勤打刻の前に、現場にいる時のスマホの位置で登録）。交通費の自動推定の基準
alter table public.projects add column if not exists site_registered_by text;
alter table public.projects add column if not exists site_registered_at timestamptz;
alter table public.projects add column if not exists site_location_source text;   -- gps / address / none
