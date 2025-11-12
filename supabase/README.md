# Supabase Database Setup

## Applying Migrations

### Option 1: Supabase Dashboard (Easiest)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of `migrations/20250112_rls_policies.sql`
4. Paste and run the SQL query

### Option 2: Supabase CLI (Recommended for Production)

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Link to your project
supabase link --project-ref your-project-ref

# Apply migrations
supabase db push
```

### Option 3: Manual SQL Execution

Connect to your Supabase PostgreSQL database and run the migration files in order.

## RLS Policies Explained

### Agent Table Policies
- **Agents can view their own profile**: Agents can only see their own data
- **Agents can create their own profile**: During signup, agents can create their profile
- **Agents can update their own profile**: Agents can edit their own information
- **Agents can view their company**: If an agent belongs to a company, they can see company details
- **Agents can view company members**: Agents can see other agents in their company

### Company Table Policies
- **Companies can view their own profile**: Companies can only see their own data
- **Companies can create their own profile**: During signup, companies can create their profile
- **Companies can update their own profile**: Companies can edit their own information
- **Companies can view their agents**: Companies can see all agents that belong to them
- **Companies can manage their agents**: Companies can update agent information (e.g., approval status)

## Testing RLS Policies

After applying the policies, test them by:

1. Creating a test agent user
2. Creating a test company user
3. Verifying agents can only see their own data
4. Verifying companies can see their agents
5. Verifying agents can't access other agents' data (unless in same company)

## Schema Overview

```sql
-- Agent table
agent (
  userID uuid (FK to auth.users)
  email text (unique)
  name text
  company uuid (FK to company.userID) -- Optional
  ...
)

-- Company table
company (
  userID uuid (FK to auth.users)
  email text (unique)
  name text
  ...
)
```

## Next Steps

After applying RLS policies:
1. Test authentication flow
2. Verify profile creation works
3. Test data access permissions
4. Monitor performance with indexes
