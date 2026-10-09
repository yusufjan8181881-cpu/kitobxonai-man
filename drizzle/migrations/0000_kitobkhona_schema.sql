create extension if not exists pg_trgm;
create type public.app_role as enum ('admin','user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "own roles readable" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "admins manage roles" on public.user_roles for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.user_roles(user_id, role) values (new.id, 'user') on conflict do nothing;
  if not exists (select 1 from public.user_roles where role = 'admin') then
    insert into public.user_roles(user_id, role) values (new.id, 'admin') on conflict do nothing;
  end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Subjects / categories
create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null default '',
  icon text not null default 'book',
  sort_order int not null default 100,
  created_at timestamptz not null default now()
);
grant select on public.subjects to anon, authenticated;
grant insert, update, delete on public.subjects to authenticated;
grant all on public.subjects to service_role;
alter table public.subjects enable row level security;
create policy "subjects public read" on public.subjects for select using (true);
create policy "subjects admin write" on public.subjects for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.clusters (
  id int primary key,
  name text not null,
  description text not null default ''
);
grant select on public.clusters to anon, authenticated;
grant insert, update, delete on public.clusters to authenticated;
grant all on public.clusters to service_role;
alter table public.clusters enable row level security;
create policy "clusters public read" on public.clusters for select using (true);
create policy "clusters admin write" on public.clusters for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.cluster_subjects (
  cluster_id int not null references public.clusters(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  primary key (cluster_id, subject_id)
);
grant select on public.cluster_subjects to anon, authenticated;
grant insert, update, delete on public.cluster_subjects to authenticated;
grant all on public.cluster_subjects to service_role;
alter table public.cluster_subjects enable row level security;
create policy "cs public read" on public.cluster_subjects for select using (true);
create policy "cs admin write" on public.cluster_subjects for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- Questions
create table public.questions (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id) on delete cascade,
  topic text not null default '',
  grade int,
  difficulty text not null default 'medium' check (difficulty in ('easy','medium','hard')),
  question text not null,
  options jsonb not null,
  correct_index int not null,
  explanation text not null default '',
  source_type text not null default 'practice' check (source_type in ('official','practice','ai')),
  source_ref text not null default '',
  status text not null default 'approved' check (status in ('approved','pending','rejected')),
  content_hash text,
  created_by uuid,
  created_at timestamptz not null default now()
);
create unique index questions_hash_uidx on public.questions(content_hash);
create index questions_subject_idx on public.questions(subject_id, status, difficulty);
create index questions_text_trgm on public.questions using gin (question gin_trgm_ops);

create or replace function public.questions_before_write()
returns trigger language plpgsql set search_path = public as $$
begin
  if jsonb_typeof(new.options) <> 'array' or jsonb_array_length(new.options) < 2 or jsonb_array_length(new.options) > 6 then
    raise exception 'options must be an array of 2-6 items';
  end if;
  if new.correct_index < 0 or new.correct_index >= jsonb_array_length(new.options) then
    raise exception 'correct_index out of range';
  end if;
  new.content_hash := md5(lower(regexp_replace(trim(new.question), '\s+', ' ', 'g')));
  return new;
end $$;
create trigger questions_bw before insert or update on public.questions
  for each row execute function public.questions_before_write();

grant select on public.questions to anon, authenticated;
grant insert, update, delete on public.questions to authenticated;
grant all on public.questions to service_role;
alter table public.questions enable row level security;
create policy "approved questions public" on public.questions for select
  using (status = 'approved' or public.has_role(auth.uid(),'admin'));
create policy "questions admin write" on public.questions for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- Library resources
create table public.resources (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id) on delete cascade,
  title text not null,
  author text not null default '',
  kind text not null default 'notes' check (kind in ('book','notes','formula','dictionary','guide','link')),
  grade int,
  topic text not null default '',
  summary text not null default '',
  content text not null default '',
  external_url text,
  download_url text,
  license text not null default '',
  source_type text not null default 'original' check (source_type in ('original','ai','external')),
  status text not null default 'approved' check (status in ('approved','pending','rejected')),
  created_by uuid,
  created_at timestamptz not null default now(),
  unique (subject_id, title)
);
create index resources_subject_idx on public.resources(subject_id, status);
create index resources_title_trgm on public.resources using gin (title gin_trgm_ops);
grant select on public.resources to anon, authenticated;
grant insert, update, delete on public.resources to authenticated;
grant all on public.resources to service_role;
alter table public.resources enable row level security;
create policy "approved resources public" on public.resources for select
  using (status = 'approved' or public.has_role(auth.uid(),'admin'));
create policy "resources admin write" on public.resources for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- Bookmarks
create table public.bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  resource_id uuid not null references public.resources(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, resource_id)
);
grant select, insert, delete on public.bookmarks to authenticated;
grant all on public.bookmarks to service_role;
alter table public.bookmarks enable row level security;
create policy "own bookmarks" on public.bookmarks for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Quiz attempts
create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  subject_id uuid references public.subjects(id) on delete set null,
  cluster_id int,
  total int not null,
  correct int not null,
  duration_seconds int not null default 0,
  created_at timestamptz not null default now()
);
grant select, insert on public.quiz_attempts to authenticated;
grant all on public.quiz_attempts to service_role;
alter table public.quiz_attempts enable row level security;
create policy "own attempts insert" on public.quiz_attempts for insert to authenticated with check (user_id = auth.uid());
create policy "own attempts read" on public.quiz_attempts for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

-- Chat
create table public.chat_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text not null default 'Сӯҳбати нав',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index chat_threads_user_idx on public.chat_threads(user_id, updated_at desc);
grant select, insert, update, delete on public.chat_threads to authenticated;
grant all on public.chat_threads to service_role;
alter table public.chat_threads enable row level security;
create policy "own threads" on public.chat_threads for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.chat_threads(id) on delete cascade,
  user_id uuid not null,
  msg_id text not null,
  role text not null,
  parts jsonb not null,
  created_at timestamptz not null default now(),
  unique (thread_id, msg_id)
);
create index chat_messages_thread_idx on public.chat_messages(thread_id, created_at);
grant select, insert, update, delete on public.chat_messages to authenticated;
grant all on public.chat_messages to service_role;
alter table public.chat_messages enable row level security;
create policy "own messages" on public.chat_messages for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Admin stats
create or replace function public.admin_stats()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'forbidden'; end if;
  return jsonb_build_object(
    'users', (select count(distinct user_id) from public.user_roles),
    'questions', (select count(*) from public.questions where status='approved'),
    'pending', (select count(*) from public.questions where status='pending') + (select count(*) from public.resources where status='pending'),
    'resources', (select count(*) from public.resources where status='approved'),
    'attempts', (select count(*) from public.quiz_attempts),
    'threads', (select count(*) from public.chat_threads)
  );
end $$;
grant execute on function public.admin_stats() to authenticated;

-- ================= SEED =================
insert into public.subjects(slug,name,description,icon,sort_order) values
('math','Математика','Алгебра, геометрия ва таҳлили математикӣ','calculator',1),
('physics','Физика','Механика, электр, оптика ва физикаи атомӣ','atom',2),
('chemistry','Химия','Химияи умумӣ, ғайриорганикӣ ва органикӣ','flask',3),
('biology','Биология','Ҳуҷайра, генетика, одам ва табиати зинда','leaf',4),
('geography','География','Географияи табиӣ, иқтисодӣ ва Тоҷикистон','globe',5),
('history-tj','Таърихи халқи тоҷик','Аз давраи қадим то Тоҷикистони соҳибистиқлол','landmark',6),
('world-history','Таърихи умумӣ','Таърихи ҷаҳон аз қадим то замони нав','scroll',7),
('tajik-lang','Забони тоҷикӣ','Фонетика, морфология, синтаксис ва имло','languages',8),
('tajik-lit','Адабиёти тоҷик','Шоирону нависандагон ва осори классикӣ','feather',9),
('russian','Забони русӣ','Грамматика ва луғати забони русӣ','book-a',10),
('english','Забони англисӣ','Grammar, vocabulary ва хониш','book-open',11),
('cs','Информатика','Асосҳои информатика ва системаҳои ҳисоб','cpu',12),
('programming','Барномасозӣ','Python, алгоритмҳо ва сохтори маълумот','code',13),
('it','Технологияҳои иттилоотӣ','Интернет, бехатарӣ ва барномаҳои офисӣ','monitor',14),
('dictionaries','Луғатҳо','Луғатҳо ва истилоҳномаҳо','book-marked',15),
('formulas','Формулаҳо ва маълумотнома','Ҷадвалҳо ва формулаҳои асосӣ','sigma',16),
('textbooks','Китобҳои дарсӣ','Китобҳои дарсии мактабӣ','library',17),
('exam-prep','Омодагӣ ба имтиҳон','Маслиҳатҳо ва маводи омодагӣ','graduation-cap',18);

insert into public.clusters(id,name,description) values
(1,'Кластери I — Илмҳои табиӣ ва техникӣ','Барои ихтисосҳои муҳандисӣ, техникӣ ва илмҳои дақиқ'),
(2,'Кластери II — Иқтисод ва география','Барои ихтисосҳои иқтисодӣ, молия ва география'),
(3,'Кластери III — Филология, педагогика ва санъат','Барои ихтисосҳои забон, адабиёт, омӯзгорӣ ва санъат'),
(4,'Кластери IV — Ҷамъиятшиносӣ ва ҳуқуқ','Барои ихтисосҳои ҳуқуқ, таърих ва илмҳои ҷамъиятӣ'),
(5,'Кластери V — Тиб, биология ва варзиш','Барои ихтисосҳои тиббӣ, биологӣ ва варзишӣ'),
(6,'Кластери VI — Информатика ва технологияҳо','Барои ихтисосҳои ИТ ва барномасозӣ');

insert into public.cluster_subjects(cluster_id, subject_id)
select c, s.id from (values
 (1,'math'),(1,'physics'),(1,'tajik-lang'),
 (2,'math'),(2,'geography'),(2,'tajik-lang'),
 (3,'tajik-lang'),(3,'tajik-lit'),(3,'english'),(3,'russian'),
 (4,'history-tj'),(4,'world-history'),(4,'tajik-lang'),
 (5,'biology'),(5,'chemistry'),(5,'tajik-lang'),
 (6,'math'),(6,'cs'),(6,'programming'),(6,'english')
) v(c, slug) join public.subjects s on s.slug = v.slug;

insert into public.questions(subject_id, topic, grade, difficulty, question, options, correct_index, explanation)
select s.id, v.topic, v.grade, v.diff, v.q, v.opts::jsonb, v.ci, v.ex from (values
('math','Алгебра',8,'easy','Қимати ифодаи 3x + 5 ҳангоми x = 4 ба чанд баробар аст?','["12","17","20","15"]',1,'3·4 + 5 = 12 + 5 = 17.'),
('math','Муодилаҳо',8,'easy','Муодилаи 2x − 6 = 10-ро ҳал кунед.','["x = 2","x = 8","x = 4","x = 16"]',1,'2x = 16, пас x = 8.'),
('math','Муодилаҳои квадратӣ',9,'medium','Решаҳои муодилаи x² − 5x + 6 = 0 кадомҳоянд?','["1 ва 6","2 ва 3","−2 ва −3","−1 ва 6"]',1,'Аз рӯи теоремаи Виет: ҳосили ҷамъ 5, ҳосили зарб 6 → 2 ва 3.'),
('math','Геометрия',8,'easy','Масоҳати росткунҷаи тарафҳояш 7 см ва 5 см чанд аст?','["12 см²","24 см²","35 см²","30 см²"]',2,'S = a·b = 7·5 = 35 см².'),
('math','Геометрия',8,'medium','Дар секунҷаи росткунҷа катетҳо 6 ва 8 мебошанд. Гипотенуза чанд аст?','["10","12","14","9"]',0,'Аз рӯи теоремаи Пифагор: √(36 + 64) = √100 = 10.'),
('math','Прогрессия',9,'medium','Аъзои 10-уми прогрессияи арифметикии 2, 5, 8, ... кадом аст?','["29","32","27","30"]',0,'aₙ = a₁ + (n−1)d = 2 + 9·3 = 29.'),
('math','Логарифм',11,'hard','log₂ 32 ба чанд баробар аст?','["4","5","6","16"]',1,'2⁵ = 32, бинобар ин log₂ 32 = 5.'),
('math','Тригонометрия',10,'medium','sin 30° ба чанд баробар аст?','["1","√3/2","1/2","√2/2"]',2,'Қимати ҷадвалӣ: sin 30° = 1/2.'),
('math','Ҳосила',11,'hard','Ҳосилаи функсияи f(x) = x³ кадом аст?','["3x²","x²","3x","x³/3"]',0,'(xⁿ)′ = n·xⁿ⁻¹, пас (x³)′ = 3x².'),
('physics','Механика',7,'easy','Воҳиди қувва дар системаи SI кадом аст?','["Ҷоул","Ватт","Нютон","Паскал"]',2,'Қувва бо нютон (Н) чен карда мешавад.'),
('physics','Механика',9,'medium','Ҷисм бо суръати 20 м/с 5 сония ҳаракат кард. Масофаи тайшуда чанд аст?','["4 м","25 м","100 м","15 м"]',2,'s = v·t = 20·5 = 100 м.'),
('physics','Динамика',9,'medium','Мувофиқи қонуни дуюми Нютон, ба ҷисми массааш 2 кг қувваи 10 Н таъсир мекунад. Шитоб чанд аст?','["5 м/с²","20 м/с²","12 м/с²","0,2 м/с²"]',0,'a = F/m = 10/2 = 5 м/с².'),
('physics','Электр',8,'medium','Қонуни Ом барои қитъаи занҷир кадом аст?','["I = U·R","I = U/R","U = I/R","R = U·I"]',1,'Қувваи ҷараён I = U/R.'),
('physics','Энергия',9,'hard','Энергияи кинетикии ҷисми массааш 4 кг, ки бо суръати 3 м/с ҳаракат мекунад, чанд аст?','["6 Ҷ","12 Ҷ","18 Ҷ","36 Ҷ"]',2,'E = mv²/2 = 4·9/2 = 18 Ҷ.'),
('physics','Оптика',11,'easy','Суръати рӯшноӣ дар вакуум тақрибан ба чанд баробар аст?','["300 000 км/с","30 000 км/с","3 000 км/с","340 м/с"]',0,'c ≈ 3·10⁸ м/с = 300 000 км/с. 340 м/с суръати садо дар ҳаво аст.'),
('chemistry','Химияи умумӣ',8,'easy','Формулаи химиявии об кадом аст?','["CO₂","H₂O","O₂","NaCl"]',1,'Молекулаи об аз ду атоми гидроген ва як атоми оксиген иборат аст.'),
('chemistry','Ҷадвали даврӣ',8,'easy','Рамзи химиявии оҳан кадом аст?','["Fe","Au","Ag","Cu"]',0,'Fe — Ferrum (оҳан). Au — тилло, Ag — нуқра, Cu — мис.'),
('chemistry','Моль',9,'medium','Массаи молярии CO₂ чанд аст? (C = 12, O = 16)','["28 г/моль","32 г/моль","44 г/моль","40 г/моль"]',2,'12 + 2·16 = 44 г/моль.'),
('chemistry','Кислотаҳо',9,'medium','Муҳити маҳлули pH = 3 кадом аст?','["Ишқорӣ","Нейтралӣ","Туршӣ","Намакӣ"]',2,'pH < 7 муҳити туршро нишон медиҳад.'),
('chemistry','Химияи органикӣ',10,'hard','Формулаи умумии алканҳо кадом аст?','["CₙH₂ₙ","CₙH₂ₙ₊₂","CₙH₂ₙ₋₂","CₙHₙ"]',1,'Алканҳо карбогидрогенҳои сер мебошанд: CₙH₂ₙ₊₂.'),
('biology','Ҳуҷайра',9,'easy','Кадом органоид «истгоҳи энергетикии» ҳуҷайра ном дорад?','["Рибосома","Митохондрия","Ядро","Лизосома"]',1,'Дар митохондрия ATP ҳосил мешавад.'),
('biology','Растаниҳо',6,'easy','Фотосинтез дар кадом органоиди ҳуҷайраи растанӣ мегузарад?','["Хлоропласт","Митохондрия","Вакуола","Ядро"]',0,'Хлоропласт хлорофилл дорад ва фотосинтез дар он ба амал меояд.'),
('biology','Генетика',10,'medium','Дар ҳуҷайраи соматикии одам чанд хромосома мавҷуд аст?','["23","44","46","48"]',2,'Одам 46 хромосома (23 ҷуфт) дорад.'),
('biology','Анатомия',8,'medium','Кадом узв хунро дар бадан ҳаракат медиҳад?','["Шуш","Ҷигар","Дил","Гурда"]',2,'Дил насоси асосии системаи гардиши хун аст.'),
('biology','Генетика',10,'hard','ДНК аз кадом воҳидҳо (мономерҳо) иборат аст?','["Аминокислотаҳо","Нуклеотидҳо","Глюкоза","Кислотаҳои чарб"]',1,'Мономерҳои ДНК нуклеотидҳо мебошанд.'),
('geography','Тоҷикистон',8,'easy','Пойтахти Ҷумҳурии Тоҷикистон кадом шаҳр аст?','["Хуҷанд","Бохтар","Душанбе","Кӯлоб"]',2,'Душанбе пойтахти Тоҷикистон аст.'),
('geography','Тоҷикистон',8,'medium','Қуллаи баландтарини Тоҷикистон кадом аст?','["Қуллаи Ленин","Қуллаи Исмоили Сомонӣ","Қуллаи Корженевская","Қуллаи Ғармо"]',1,'Қуллаи Исмоили Сомонӣ (7495 м) баландтарин қулла дар Тоҷикистон аст.'),
('geography','Тоҷикистон',8,'medium','Тақрибан чанд фоизи қаламрави Тоҷикистонро кӯҳҳо ташкил медиҳанд?','["зиёда аз 90%","50%","30%","70%"]',0,'Зиёда аз 90%-и қаламрави кишвар кӯҳистон аст.'),
('geography','Географияи ҷаҳон',7,'easy','Калонтарин уқёнуси ҷаҳон кадом аст?','["Атлантик","Ҳинд","Ором","Яхбастаи Шимолӣ"]',2,'Уқёнуси Ором аз ҳама калонтарин аст.'),
('geography','Тоҷикистон',8,'medium','Нерӯгоҳи барқи обии Роғун дар кадом дарё сохта мешавад?','["Зарафшон","Вахш","Панҷ","Сир"]',1,'НБО-и Роғун дар дарёи Вахш ҷойгир аст.'),
('history-tj','Сомониён',8,'easy','Асосгузори давлати Сомониён кӣ ҳисобида мешавад?','["Исмоили Сомонӣ","Наср ибни Аҳмад","Сомонхудот","Маҳмуди Ғазнавӣ"]',0,'Исмоили Сомонӣ (849–907) давлати мутамаркази Сомониёнро бунёд кард.'),
('history-tj','Истиқлолият',9,'easy','Истиқлолияти давлатии Ҷумҳурии Тоҷикистон кай эълон шуд?','["9 сентябри 1991","24 августи 1990","6 ноябри 1994","27 июни 1997"]',0,'9 сентябри соли 1991 Тоҷикистон соҳибистиқлол эълон шуд.'),
('history-tj','Ваҳдат',9,'medium','Созишномаи умумии истиқрори сулҳ ва ризоияти миллӣ кай имзо шуд?','["9 сентябри 1991","27 июни 1997","6 ноябри 1994","1 январи 2000"]',1,'27 июн — Рӯзи Ваҳдати миллӣ.'),
('history-tj','Конститутсия',9,'medium','Конститутсияи Ҷумҳурии Тоҷикистон кай қабул шуд?','["6 ноябри 1994","9 сентябри 1991","27 июни 1997","24 августи 1990"]',0,'Конститутсия 6 ноябри 1994 бо раъйпурсии умумихалқӣ қабул шуд.'),
('history-tj','Сомониён',8,'medium','Пойтахти давлати Сомониён кадом шаҳр буд?','["Самарқанд","Бухоро","Марв","Хуҷанд"]',1,'Бухоро пойтахти Сомониён буд.'),
('world-history','Ҷанги дуюми ҷаҳонӣ',11,'easy','Ҷанги дуюми ҷаҳонӣ дар кадом сол ба охир расид?','["1918","1939","1945","1950"]',2,'Ҷанг соли 1945 ба охир расид.'),
('world-history','Аҳди қадим',6,'medium','Пирамидаҳои машҳури Ҷиза дар кадом кишвар ҷойгиранд?','["Юнон","Миср","Ироқ","Ҳиндустон"]',1,'Пирамидаҳои Ҷиза дар Миср ҷойгиранд.'),
('tajik-lang','Морфология',7,'easy','Калимаи «китоб» кадом ҳиссаи нутқ аст?','["Феъл","Сифат","Исм","Зарф"]',2,'«Китоб» номи предметро ифода мекунад — исм.'),
('tajik-lang','Морфология',7,'medium','Шакли ҷамъи калимаи «дарахт» бо пасвандӣ «-он» кадом аст?','["дарахтҳо","дарахтон","дарахтот","дарахтҳон"]',1,'Ба исмҳои ҷондор ва баъзе растаниҳо пасванди «-он» илова мешавад: дарахтон.'),
('tajik-lang','Фонетика',5,'easy','Дар алифбои ҳозираи тоҷикӣ (хати кириллӣ) чанд ҳарф мавҷуд аст?','["33","35","32","30"]',1,'Алифбои тоҷикӣ 35 ҳарф дорад.'),
('tajik-lang','Синтаксис',8,'medium','Дар ҷумлаи «Донишҷӯ китоб мехонад» мубтадо кадом аст?','["китоб","мехонад","Донишҷӯ","ҳеҷ кадом"]',2,'Мубтадо ба саволи «кӣ?» ҷавоб медиҳад — донишҷӯ.'),
('tajik-lit','Классика',9,'easy','Муаллифи «Шоҳнома» кист?','["Рӯдакӣ","Фирдавсӣ","Саъдӣ","Ҳофиз"]',1,'Абулқосим Фирдавсӣ «Шоҳнома»-ро эҷод кардааст.'),
('tajik-lit','Классика',8,'easy','Кадом шоир «Одами шоирон» номида мешавад?','["Ҷомӣ","Рӯдакӣ","Хайём","Носири Хусрав"]',1,'Абӯабдуллоҳи Рӯдакӣ одамушшуаро — сардафтари адабиёти форсу тоҷик аст.'),
('tajik-lit','Классика',9,'medium','«Гулистон» ва «Бӯстон» асарҳои кадом адиб мебошанд?','["Саъдии Шерозӣ","Ҳофизи Шерозӣ","Ҷалолиддини Румӣ","Абдураҳмони Ҷомӣ"]',0,'Ҳар ду асар ба қалами Саъдии Шерозӣ тааллуқ доранд.'),
('tajik-lit','Адабиёти навин',10,'medium','Муаллифи «Ёддоштҳо» кист?','["Садриддин Айнӣ","Мирзо Турсунзода","Абулқосим Лоҳутӣ","Бобоҷон Ғафуров"]',0,'«Ёддоштҳо» асари Садриддин Айнӣ аст.'),
('english','Grammar',7,'easy','Калимаи дурустро интихоб кунед: «She ___ a student.»','["am","is","are","be"]',1,'Бо ҷонишини she шакли is истифода мешавад.'),
('english','Grammar',8,'medium','Шакли гузаштаи феъли «go» кадом аст?','["goed","gone","went","going"]',2,'go – went – gone (феъли нодуруст).'),
('english','Vocabulary',6,'easy','Тарҷумаи калимаи «book» ба тоҷикӣ кадом аст?','["Қалам","Китоб","Мактаб","Дафтар"]',1,'book — китоб.'),
('russian','Грамматика',7,'easy','Калимаи «стол» ба кадом ҷинс тааллуқ дорад?','["Мардона","Занона","Миёна","Ҷамъ"]',0,'«Стол» исми ҷинси мардона аст (он).'),
('russian','Луғат',6,'easy','Тарҷумаи калимаи «школа» ба тоҷикӣ кадом аст?','["Донишгоҳ","Мактаб","Китобхона","Синф"]',1,'школа — мактаб.'),
('cs','Системаҳои ҳисоб',9,'easy','1 байт аз чанд бит иборат аст?','["4","8","16","10"]',1,'1 байт = 8 бит.'),
('cs','Системаҳои ҳисоб',9,'medium','Адади 1010 дар системаи дуӣ ба кадом адади даҳӣ баробар аст?','["8","10","12","5"]',1,'1·8 + 0·4 + 1·2 + 0·1 = 10.'),
('cs','Сахтафзор',8,'easy','Кадом дастгоҳ дастгоҳи вуруд мебошад?','["Монитор","Принтер","Клавиатура","Баландгӯяк"]',2,'Клавиатура маълумотро ба компютер ворид мекунад.'),
('programming','Python',10,'medium','Натиҷаи print(2 ** 3) дар Python чист?','["6","8","9","5"]',1,'** амали дараҷа аст: 2³ = 8.'),
('programming','Алгоритмҳо',10,'medium','Кадом сохтор барои такрори амалҳо истифода мешавад?','["if","for","print","def"]',1,'Даври for амалҳоро такрор мекунад.'),
('it','Бехатарӣ',9,'easy','Кадом парол аз ҳама бехатартар аст?','["123456","password","Tj#2026!kitob","qwerty"]',2,'Пароли дароз бо ҳарфҳо, рақамҳо ва аломатҳо бехатартар аст.')
) v(slug,topic,grade,diff,q,opts,ci,ex) join public.subjects s on s.slug = v.slug;

insert into public.resources(subject_id,title,author,kind,grade,topic,summary,content,external_url,license,source_type)
select s.id, v.title, v.author, v.kind, v.grade, v.topic, v.summary, v.content, v.url, v.lic, v.src from (values
('formulas','Формулаҳои асосии алгебра','КИТОБХОНАИ МАН','formula',9,'Алгебра','Формулаҳои зарби мухтасар, квадрати суммавӣ ва муодилаи квадратӣ.',
E'## Формулаҳои зарби мухтасар\n\n- (a + b)² = a² + 2ab + b²\n- (a − b)² = a² − 2ab + b²\n- a² − b² = (a − b)(a + b)\n- (a + b)³ = a³ + 3a²b + 3ab² + b³\n- a³ + b³ = (a + b)(a² − ab + b²)\n\n## Муодилаи квадратӣ\n\nax² + bx + c = 0\n\n- Дискриминант: D = b² − 4ac\n- Решаҳо: x = (−b ± √D) / 2a\n- Агар D > 0 — ду реша, D = 0 — як реша, D < 0 — реша надорад.\n\n## Теоремаи Виет\n\nx₁ + x₂ = −b/a, x₁ · x₂ = c/a\n\n## Дараҷаҳо\n\n- aᵐ · aⁿ = aᵐ⁺ⁿ\n- aᵐ : aⁿ = aᵐ⁻ⁿ\n- (aᵐ)ⁿ = aᵐⁿ\n- a⁰ = 1',null,'Маводи аслӣ','original'),
('formulas','Формулаҳои геометрия','КИТОБХОНАИ МАН','formula',9,'Геометрия','Масоҳат ва периметри шаклҳо, теоремаи Пифагор.',
E'## Масоҳатҳо\n\n| Шакл | Формула |\n|---|---|\n| Росткунҷа | S = a · b |\n| Квадрат | S = a² |\n| Секунҷа | S = ½ · a · h |\n| Доира | S = π r² |\n| Трапетсия | S = ½ (a + b) · h |\n| Параллелограмм | S = a · h |\n\n## Дарозии давра\n\nC = 2πr\n\n## Теоремаи Пифагор\n\nc² = a² + b² (c — гипотенуза)\n\n## Ҳаҷмҳо\n\n- Мукааб: V = a³\n- Параллелепипед: V = a·b·c\n- Силиндр: V = πr²h\n- Кура: V = 4/3 · πr³',null,'Маводи аслӣ','original'),
('formulas','Формулаҳои асосии физика','КИТОБХОНАИ МАН','formula',9,'Механика ва электр','Формулаҳои механика, энергия ва электр.',
E'## Механика\n\n- Суръат: v = s / t\n- Шитоб: a = (v − v₀) / t\n- Қонуни II Нютон: F = m · a\n- Вазн: P = m · g (g ≈ 9,8 м/с²)\n- Импулс: p = m · v\n\n## Энергия ва кор\n\n- Кор: A = F · s\n- Энергияи кинетикӣ: Eₖ = mv² / 2\n- Энергияи потенсиалӣ: Eₚ = mgh\n- Тавоноӣ: N = A / t\n\n## Электр\n\n- Қонуни Ом: I = U / R\n- Кори ҷараён: A = U · I · t\n- Тавоноӣ: P = U · I\n\n## Фишор\n\np = F / S',null,'Маводи аслӣ','original'),
('chemistry','Ҷадвали даврӣ: асосҳо','КИТОБХОНАИ МАН','notes',8,'Ҷадвали даврӣ','Сохтори ҷадвали Менделеев ва элементҳои муҳим.',
E'## Ҷадвали даврии элементҳо\n\nҶадвалро Д. И. Менделеев соли 1869 тартиб додааст. Элементҳо аз рӯи афзоиши рақами тартибӣ (шумораи протонҳо) ҷойгир шудаанд.\n\n- **Давр** — қатори уфуқӣ; рақами давр шумораи қабатҳои электрониро нишон медиҳад.\n- **Гурӯҳ** — сутуни амудӣ; элементҳои як гурӯҳ хосиятҳои монанд доранд.\n\n## Элементҳои муҳим\n\n| Элемент | Рамз | Массаи атомӣ |\n|---|---|---|\n| Гидроген | H | 1 |\n| Карбон | C | 12 |\n| Нитроген | N | 14 |\n| Оксиген | O | 16 |\n| Натрий | Na | 23 |\n| Хлор | Cl | 35,5 |\n| Оҳан | Fe | 56 |',null,'Маводи аслӣ','original'),
('biology','Ҳуҷайра ва органоидҳои он','КИТОБХОНАИ МАН','notes',9,'Ҳуҷайра','Шарҳи кӯтоҳи сохтори ҳуҷайра.',
E'## Ҳуҷайра — воҳиди асосии ҳаёт\n\nҲамаи организмҳои зинда аз ҳуҷайра иборатанд.\n\n## Органоидҳои асосӣ\n\n- **Ядро** — маълумоти ирсӣ (ДНК)-ро нигоҳ медорад.\n- **Митохондрия** — энергия (ATP) ҳосил мекунад.\n- **Рибосома** — сафедаҳоро синтез мекунад.\n- **Хлоропласт** — танҳо дар растаниҳо; фотосинтез.\n- **Мембранаи ҳуҷайра** — гузариши моддаҳоро идора мекунад.\n- **Вакуола** — захираи об ва моддаҳо.\n\n## Фарқи ҳуҷайраи растанӣ ва ҳайвонот\n\nҲуҷайраи растанӣ девораи селлюлозӣ, хлоропласт ва вакуолаи калон дорад.',null,'Маводи аслӣ','original'),
('history-tj','Давлати Сомониён','КИТОБХОНАИ МАН','notes',8,'Асрҳои миёна','Таърихи мухтасари давлати Сомониён (асрҳои IX–X).',
E'## Давлати Сомониён (875–999)\n\nСомониён аввалин давлати мутамаркази тоҷикон дар асрҳои миёна мебошад.\n\n- **Асосгузор:** Исмоили Сомонӣ (849–907)\n- **Пойтахт:** Бухоро\n- **Забони давлатӣ ва адабӣ:** форсии тоҷикӣ\n\n## Дастовардҳо\n\n- Рушди илм, адабиёт ва савдо\n- Фаъолияти Рӯдакӣ, Ибни Сино ва дигар олимону шоирон\n- Сохтмони мақбараи Исмоили Сомонӣ дар Бухоро\n\nСоли 1999 дар Тоҷикистон 1100-солагии давлати Сомониён ҷашн гирифта шуд.',null,'Маводи аслӣ','original'),
('tajik-lang','Ҳиссаҳои нутқ дар забони тоҷикӣ','КИТОБХОНАИ МАН','notes',7,'Морфология','Ҳиссаҳои мустақил ва ёридиҳандаи нутқ.',
E'## Ҳиссаҳои мустақили нутқ\n\n1. **Исм** — кӣ? чӣ? (китоб, модар)\n2. **Сифат** — чӣ гуна? (зебо, калон)\n3. **Шумора** — чанд? чандум? (се, сеюм)\n4. **Ҷонишин** — ман, ту, ӯ\n5. **Феъл** — чӣ кард? (навишт, меравад)\n6. **Зарф** — чӣ тавр? кай? (тез, имрӯз)\n\n## Ҳиссаҳои ёридиҳанда\n\n- Пешоянд (аз, ба, бо), пасоянд (-ро), пайвандак (ва, ки, аммо), ҳиссача (ҳам, низ)\n\n## Нидо ва калимаҳои тақлидӣ\n\nВой!, Офарин!, шар-шар',null,'Маводи аслӣ','original'),
('tajik-lit','Абӯабдуллоҳи Рӯдакӣ','КИТОБХОНАИ МАН','notes',8,'Адабиёти классикӣ','Зиндагинома ва эҷодиёти Одамушшуаро.',
E'## Рӯдакӣ (тақрибан 858–941)\n\nАбӯабдуллоҳ Ҷаъфар ибни Муҳаммади Рӯдакӣ дар деҳаи Панҷрӯди наздики Панҷакент таваллуд шудааст. Ӯро «Одамушшуаро» — сардафтари шоирон меноманд.\n\n- Дар дарбори Сомониён (Бухоро) зиндагӣ кардааст.\n- Аз мероси бузурги ӯ қисми ками ашъор то замони мо расидааст.\n- Шеъри машҳур: «Бӯи ҷӯи Мӯлиён ояд ҳаме».\n\n## Мавзӯъҳои асосӣ\n\nПанду ахлоқ, шодии зиндагӣ, табиат, пирӣ ва ҷавонӣ.',null,'Маводи аслӣ','original'),
('programming','Python барои навомӯзон','КИТОБХОНАИ МАН','guide',10,'Python','Асосҳои забони Python: тағйирёбандаҳо, шартҳо ва даврҳо.',
E'## Тағйирёбандаҳо\n\n```python\nnom = \"Алӣ\"\nsinn = 16\nprint(nom, sinn)\n```\n\n## Шарт\n\n```python\nif sinn >= 18:\n    print(\"Калонсол\")\nelse:\n    print(\"Наврас\")\n```\n\n## Давр\n\n```python\nfor i in range(1, 6):\n    print(i * i)\n```\n\n## Функсия\n\n```python\ndef jam(a, b):\n    return a + b\n\nprint(jam(3, 4))  # 7\n```\n\nБарои амалия метавонед Python-ро аз сомонаи расмии python.org насб кунед.','https://www.python.org/about/gettingstarted/','Маводи аслӣ; истинод ба сомонаи расмӣ','original'),
('it','Бехатарӣ дар интернет','КИТОБХОНАИ МАН','notes',9,'Бехатарӣ','Қоидаҳои асосии бехатарии рақамӣ барои хонандагон.',
E'## Қоидаҳои асосӣ\n\n1. Пароли дароз ва гуногун истифода баред (на камтар аз 12 аломат).\n2. Паролро ба ҳеҷ кас нагӯед.\n3. Ба пайвандҳои шубҳанок пахш накунед.\n4. Тасдиқи дуқадамаро фаъол созед.\n5. Барномаҳоро танҳо аз манбаъҳои расмӣ насб кунед.\n6. Маълумоти шахсиро дар шабакаҳои иҷтимоӣ кам нашр кунед.',null,'Маводи аслӣ','original'),
('english','Замонҳои асосии забони англисӣ','КИТОБХОНАИ МАН','notes',8,'Grammar','Present, Past ва Future Simple бо мисолҳо.',
E'## Present Simple\n\nАмали доимӣ: I **read** books. She **reads** books.\n\n## Past Simple\n\nАмали гузашта: I **read** yesterday. They **went** home.\n\n## Future Simple\n\nАмали оянда: I **will read** tomorrow.\n\n## Present Continuous\n\nАмали ҳозира: I **am reading** now.',null,'Маводи аслӣ','original'),
('russian','Падежҳои забони русӣ','КИТОБХОНАИ МАН','notes',8,'Грамматика','Шаш падеж ва саволҳои онҳо.',
E'| Падеж | Савол | Мисол |\n|---|---|---|\n| Именительный | кто? что? | книга |\n| Родительный | кого? чего? | книги |\n| Дательный | кому? чему? | книге |\n| Винительный | кого? что? | книгу |\n| Творительный | кем? чем? | книгой |\n| Предложный | о ком? о чём? | о книге |',null,'Маводи аслӣ','original'),
('exam-prep','Чӣ тавр ба имтиҳони дохилшавӣ омода шудан мумкин','КИТОБХОНАИ МАН','guide',11,'Маслиҳатҳо','Нақшаи омодагӣ ба тестҳои Маркази миллии тестӣ.',
E'## Нақшаи омодагӣ\n\n1. Кластери худро муайян кунед ва фанҳои онро бинависед.\n2. Ҳар рӯз 1–2 соат ба як фан ҷудо кунед.\n3. Ҳар ҳафта тести машқӣ бо вақт супоред.\n4. Хатоҳоро дар дафтари алоҳида нависед ва такрор кунед.\n5. Маълумоти расмӣ ва санаҳоро танҳо аз сомонаи Маркази миллии тестӣ гиред.\n\n## Дар рӯзи имтиҳон\n\n- Хуб хоб кунед, барвақт ҳозир шавед.\n- Аввал саволҳои осонро ҷавоб диҳед.','https://ntc.tj','Маводи аслӣ; истинод ба сомонаи расмӣ','original'),
('dictionaries','Луғати Википедияи тоҷикӣ','Википедия','link',null,'Маълумотнома','Энсиклопедияи озоди тоҷикизабон.','Википедияи тоҷикӣ — энсиклопедияи озод бо ҳазорон мақола ба забони тоҷикӣ. Барои ҷустуҷӯи истилоҳот ва маълумоти иловагӣ истифода баред.','https://tg.wikipedia.org','CC BY-SA','external'),
('math','Khan Academy — математика','Khan Academy','link',null,'Видеодарсҳо','Дарсҳои ройгони математика (бо забонҳои англисӣ ва русӣ).','Khan Academy платформаи ройгони таълимӣ бо видеодарсҳо ва машқҳо аз арифметика то таҳлили математикӣ мебошад.','https://www.khanacademy.org/math','Ройгон барои истифодаи шахсӣ','external')
) v(slug,title,author,kind,grade,topic,summary,content,url,lic,src) join public.subjects s on s.slug = v.slug;