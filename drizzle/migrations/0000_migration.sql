create table public.topics (id text primary key, name text not null);
create table public.concepts (id text primary key, topic_id text not null references public.topics(id), position int not null, question text not null);
create table public.triggers (id text primary key, concept_id text not null references public.concepts(id), phrase text not null, follow_up text not null);
create table public.cases (id text primary key, concept_id text not null unique references public.concepts(id), case_text text not null, answer_text text not null, check_words jsonb not null);
create table public.attempts (id uuid primary key default gen_random_uuid(), session_id uuid not null, concept_id text not null references public.concepts(id), explanation text not null, created_at timestamptz not null default now());
create table public.gaps (id uuid primary key default gen_random_uuid(), attempt_id uuid not null references public.attempts(id), session_id uuid not null, recited_sentence text not null, trigger_id text references public.triggers(id), follow_up text not null, created_at timestamptz not null default now());
create table public.retries (id uuid primary key default gen_random_uuid(), gap_id uuid not null references public.gaps(id), session_id uuid not null, second_try text not null, case_id text not null references public.cases(id), case_answer text, passed boolean, created_at timestamptz not null default now());

grant all on public.topics, public.concepts, public.triggers, public.cases, public.attempts, public.gaps, public.retries to service_role;
alter table public.topics enable row level security;
alter table public.concepts enable row level security;
alter table public.triggers enable row level security;
alter table public.cases enable row level security;
alter table public.attempts enable row level security;
alter table public.gaps enable row level security;
alter table public.retries enable row level security;

insert into public.topics values ('M2','Module 2: How Apps Work Behind the Screen');
insert into public.concepts values
('C1','M2',1,'Why does an app need a computer somewhere else (a "server")? Why not run everything on your phone?'),
('C2','M2',2,'When an app asks another service for something, what does the request need to contain?'),
('C3','M2',3,'Why can''t an app''s secret key (the password it uses to pay for AI) sit inside the webpage?'),
('C4','M2',4,'Why does an app forget everything if it doesn''t save things?'),
('C5','M2',5,'One mom has three kids. On index cards, do you write the link on the mom''s card or on each kid''s card?'),
('C6','M2',6,'Your weight changes every week. Do you erase the old number or add a new line?'),
('C7','M2',7,'Some things live on your phone, some on the company''s computer. How do you decide where each thing goes?'),
('C8','M2',8,'When an app asks an AI for help, what exactly does it send?'),
('C9','M2',9,'Why can''t you see other people''s emails?'),
('C10','M2',10,'Should an AI or a fixed rule decide if a test answer is right?');
insert into public.triggers values
('C1-1','C1','the server handles it','Handles what, exactly? Name one thing your phone alone couldn''t do.'),
('C1-2','C1','for security','With no server, what could a user do that they can''t do now?'),
('C1-3','C1','that''s how apps work','A chat app has only phones, no server. Your friend''s phone is off. Where does your message go?'),
('C2-1','C2','it sends data','Which data? Which missing piece would stop the service from answering?'),
('C2-2','C2','request and response','What must the service know to answer correctly, and to know you''re allowed to ask?'),
('C2-3','C2','it talks to the server','What exactly does it say? Name the parts of the message.'),
('C3-1','C3','for security reasons','Security from whom? Who can see what''s inside a webpage?'),
('C3-2','C3','hackers','Does it take a hacker? What can any normal visitor do with a page''s code?'),
('C3-3','C3','it''s not safe','What would someone do with the key, and who pays?'),
('C4-1','C4','it needs a database','Where is the information while the app is open, and what happens to that place when it closes?'),
('C4-2','C4','data persistence','Say it without that word: what disappears, and when?'),
('C4-3','C4','it''s in memory','What happens to that memory when you close the app or restart the phone?'),
('C5-1','C5','foreign key','What would go wrong if you wrote it on the mom''s card?'),
('C5-2','C5','it links them','Which card holds the link, and why that one?'),
('C5-3','C5','relationships','The mom has a fourth kid. Which card design breaks?'),
('C6-1','C6','to keep records','What question could you never answer again if you erased it?'),
('C6-2','C6','for tracking','Tracking what? What''s missing after you overwrite?'),
('C6-3','C6','audit trail','Someone asks "what was it last month?" What must you have kept?'),
('C7-1','C7','it depends','Depends on what? Name the one question you''d ask about each thing.'),
('C7-2','C7','separation of concerns','Say it plainly: who must NOT be able to change this?'),
('C7-3','C7','best practice','What breaks if you ignore it? Give one example.'),
('C8-1','C8','a prompt','Whose words are in it, only the user''s? What else must be there?'),
('C8-2','C8','the AI figures it out','If the AI gets only "My bill is $200," how does it know what to do?'),
('C8-3','C8','it sends the question','The user''s question or the app''s? What happens if only one is sent?'),
('C9-1','C9','privacy','Privacy is the goal. What actually checks, on every request, whose email it is?'),
('C9-2','C9','encrypted','The server unlocks your emails to show them to you. What stops it unlocking someone else''s for you?'),
('C9-3','C9','you need a password','You''re logged in. You ask for email #5,001, someone else''s. What stops the server sending it?'),
('C10-1','C10','AI is smarter','Send the exact same answer to the AI twice. What could happen to the grade?'),
('C10-2','C10','more flexible','Should a grade ever change for the same answer?'),
('C10-3','C10','rules are too rigid','What does a fixed rule guarantee that a flexible one doesn''t?');
insert into public.cases values
('C1-case','C1','Two users want to see the same list in an app. Where must the list live so both can see it?','On the server.','[["server","backend"]]'),
('C2-case','C2','An app calls a translation API but doesn''t send the text to translate. What comes back?','An error. There''s nothing to translate.','[["error","nothing","fail","fails"]]'),
('C3-case','C3','An API key is in the frontend code. Who can read it?','Anyone who opens the app.','[["anyone","everyone","any user","users"]]'),
('C4-case','C4','An app keeps data only in memory, with no database. The server restarts. Is the data still there?','No. It''s lost.','[["no","lost","gone"]]'),
('C5-case','C5','One user has many orders. Which table gets the user_id column: users or orders?','Orders.','[["orders","order"]]'),
('C6-case','C6','To keep a history of price changes, do you update the old row or add a new row?','Add a new row.','[["new row","add","insert"]]'),
('C7-case','C7','Where should the password check run: frontend or backend?','Backend.','[["backend","server"]]'),
('C8-case','C8','When an app calls an LLM, does it send only the user''s text, or also its own instructions?','Both: its instructions plus the user''s text.','[["both","instructions","also"]]'),
('C9-case','C9','User A is logged in. Should the database return User B''s rows to them?','No. Row rules return only your own rows.','[["no"]]'),
('C10-case','C10','An LLM grades the same answer twice and gives two different grades. What should decide pass or fail instead?','A fixed answer key in code.','[["key","code","fixed","rule"]]');