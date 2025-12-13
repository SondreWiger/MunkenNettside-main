# Family Accounts Migration Instructions

The Family Accounts feature is now implemented in code, but requires a database migration to be applied.

## Steps to Apply the Migration:

### Option 1: Via Supabase Dashboard (Recommended)

1. Go to your Supabase project: https://app.supabase.com
2. Click on the **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy and paste the entire contents of `scripts/006-add-family-accounts.sql`
5. Click **Run** (or press `Ctrl+Enter`)

### Option 2: Via Node Script

Run the migration script (first ensure you have the correct environment variables):

```bash
cd /Users/sondrey/Downloads/MunkenNettside-main\ 2
node run-family-migration.mjs
```

This will display the SQL that needs to be run.

---

## What the Migration Does:

1. **Adds columns to users table:**
   - `account_type` - Type of account: 'standalone' (default), 'parent', or 'kid'
   - `date_of_birth` - Birth date (required for kid accounts)
   - `family_connection_code` - 8-character code parents generate
   - `family_code_expires_at` - When the code expires

2. **Creates family_connections table:**
   - Links parent and child accounts
   - Stores connection status and dates
   - Includes RLS policies for security

3. **Updates ensemble_enrollments table:**
   - Adds `registered_by_user_id` column for parent-proxy registrations

4. **Enables Row Level Security (RLS):**
   - Users can only see their own connections
   - Parents can view connected children's profiles
   - Admins can manage all connections

---

## Testing After Migration:

1. **Registration with account types:**
   - Go to `/registrer`
   - Test creating accounts as: Standalone, Parent, Kid
   - For kid accounts, enter a date of birth

2. **Generate connection code (as parent):**
   - Go to `/dashboard/innstillinger`
   - Click **Familie** tab
   - Click **Generer koblingskode**
   - Copy the 8-character code

3. **Connect child to parent:**
   - Log in as a kid account
   - Go to `/dashboard/innstillinger`
   - Click **Familie** tab
   - Paste parent's code and click **Koble til**

4. **View family connections:**
   - Parent sees list of connected children
   - Kid sees list of connected parents

---

## Files Updated:

- ✅ `/components/auth/register-form.tsx` - Added account type selector + DOB field
- ✅ `/app/dashboard/innstillinger/page.tsx` - Added Family tab with connection management
- ✅ `/app/api/family/generate-code/route.ts` - Parent code generation
- ✅ `/app/api/family/connect/route.ts` - Kid connection logic
- ✅ `/app/api/family/connections/route.ts` - List/delete connections
- ⏳ Database schema (migration needed - `scripts/006-add-family-accounts.sql`)

---

Run the migration now to enable family accounts!
