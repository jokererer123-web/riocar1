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

The `002_secure_loyalty.sql` migration removes direct transaction inserts. Workers call an atomic database function that validates the staff role and customer, reads trusted service data, and updates loyalty in one transaction.

## Multi-service checkout (migration 003)

Run `003_orders_and_cancellations.sql` after migrations 001 and 002. It adds:

- `orders` and `order_items` for multi-service baskets and custom cashier prices
- `points_ledger` for an auditable history of every balance change
- idempotent `create_order` checkout to prevent duplicate charges
- staff-only customer lookup before checkout
- admin-only cancellation with automatic point reversal
- admin point adjustments that require an audit note
- configurable free reward service in `loyalty_settings.reward_service_id`

Existing rows in `transactions` are imported into the new order tables without changing customer balances. New sales should use `create_order`; the old single-service RPC remains only for backward compatibility until all clients are upgraded.
