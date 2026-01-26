-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create Contacts table
create table public.contacts (
    id uuid default uuid_generate_v4() primary key,
    phone_number text not null unique,
    name text,
    profile_pic_url text,
    email text,
    tags text[], -- Array of strings
    custom_attributes jsonb default '{}'::jsonb,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create Messages table
create table public.messages (
    id uuid default uuid_generate_v4() primary key,
    whatsapp_message_id text unique,
    contact_id uuid references public.contacts(id) on delete cascade,
    direction text check (direction in ('inbound', 'outbound')),
    type text default 'text', -- text, image, template, etc.
    status text default 'sent', -- sent, delivered, read, failed
    body text,
    media_url text,
    metadata jsonb default '{}'::jsonb,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create Templates table
create table public.templates (
    id uuid default uuid_generate_v4() primary key,
    name text not null,
    content text not null,
    category text,
    language text default 'es',
    status text default 'approved',
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create Broadcasts table (Campaigns)
create table public.broadcasts (
    id uuid default uuid_generate_v4() primary key,
    name text not null,
    template_id uuid references public.templates(id),
    audience_tags text[], -- Target contacts with these tags
    scheduled_at timestamp with time zone,
    status text default 'draft', -- draft, scheduled, processing, completed
    stats jsonb default '{"sent": 0, "delivered": 0, "read": 0, "failed": 0}'::jsonb,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Basic RLS Policies (Open for now since we use Service Key in backend, but good practice)
alter table public.contacts enable row level security;
alter table public.messages enable row level security;
alter table public.templates enable row level security;
alter table public.broadcasts enable row level security;

-- Policy to allow anon (API) read access (for dev simplicity, refine later)
create policy "Allow public read access" on public.contacts for select using (true);
create policy "Allow public insert access" on public.contacts for insert with check (true);
create policy "Allow public update access" on public.contacts for update using (true);

create policy "Allow public read access" on public.messages for select using (true);
create policy "Allow public insert access" on public.messages for insert with check (true);
create policy "Allow public update access" on public.messages for update using (true);
