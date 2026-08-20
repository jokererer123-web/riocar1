# Supabase setup

Apply migrations in numeric order from the Supabase SQL editor or CLI:

```bash
supabase db push
```

## Authentication settings

Customer accounts use a generated internal email (`<digits>@rio-customers.local`) while the UI asks for a phone number. For this flow, disable **Confirm email** in Supabase Authentication unless you configure a real email/SMS confirmation provider.

Add the project URL and anonymous key to:

- `web/.env.local` using `web/.env.example`
- `mobile/.env` using `mobile/.env.example`

Never expose `SUPABASE_SERVICE_ROLE_KEY` through a `NEXT_PUBLIC_` or `EXPO_PUBLIC_` variable.

## Provision the first admin

1. Create a user in Authentication → Users with an email and password.
2. Run the following in the SQL editor, replacing the values:

```sql
insert into public.profiles (id, phone, full_name, role)
select id, '996000000001', 'Rio Admin', 'admin'
from auth.users
where email = 'admin@example.com'
on conflict (id) do update
set phone = excluded.phone, full_name = excluded.full_name, role = 'admin';
```

## Provision a worker

The worker portal converts worker ID `karakol01` to `karakol01@rio-workers.local`.
Create that authentication user, then run:

```sql
insert into public.profiles (id, phone, full_name, role, worker_id)
select id, '996000000002', 'Worker name', 'worker', 'karakol01'
from auth.users
where email = 'karakol01@rio-workers.local'
on conflict (id) do update
set phone = excluded.phone, full_name = excluded.full_name,
    role = 'worker', worker_id = excluded.worker_id;
```

The `002_secure_loyalty.sql` migration removes direct transaction inserts. Workers call the atomic `process_loyalty_transaction` RPC, which validates the staff role and customer, reads the trusted service price and points, and updates the loyalty balance in one database transaction.
