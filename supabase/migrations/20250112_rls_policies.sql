-- Enable Row Level Security on agent and company tables
ALTER TABLE public.agent ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company ENABLE ROW LEVEL SECURITY;

-- ============================================
-- AGENT TABLE POLICIES
-- ============================================

-- Policy: Agents can view their own profile
CREATE POLICY "Agents can view their own profile"
ON public.agent
FOR SELECT
TO authenticated
USING (auth.uid() = "userID");

-- Policy: Agents can insert their own profile (during signup)
CREATE POLICY "Agents can create their own profile"
ON public.agent
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = "userID");

-- Policy: Agents can update their own profile
CREATE POLICY "Agents can update their own profile"
ON public.agent
FOR UPDATE
TO authenticated
USING (auth.uid() = "userID")
WITH CHECK (auth.uid() = "userID");

-- Policy: Agents can view their company's information
CREATE POLICY "Agents can view their company"
ON public.company
FOR SELECT
TO authenticated
USING (
  "userID" IN (
    SELECT company
    FROM public.agent
    WHERE "userID" = auth.uid() AND company IS NOT NULL
  )
);

-- Policy: Agents can view other agents in their company
CREATE POLICY "Agents can view company members"
ON public.agent
FOR SELECT
TO authenticated
USING (
  company IN (
    SELECT company
    FROM public.agent
    WHERE "userID" = auth.uid() AND company IS NOT NULL
  )
);

-- ============================================
-- COMPANY TABLE POLICIES
-- ============================================

-- Policy: Companies can view their own profile
CREATE POLICY "Companies can view their own profile"
ON public.company
FOR SELECT
TO authenticated
USING (auth.uid() = "userID");

-- Policy: Companies can insert their own profile (during signup)
CREATE POLICY "Companies can create their own profile"
ON public.company
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = "userID");

-- Policy: Companies can update their own profile
CREATE POLICY "Companies can update their own profile"
ON public.company
FOR UPDATE
TO authenticated
USING (auth.uid() = "userID")
WITH CHECK (auth.uid() = "userID");

-- Policy: Companies can view all agents that belong to them
CREATE POLICY "Companies can view their agents"
ON public.agent
FOR SELECT
TO authenticated
USING (
  company = auth.uid()
);

-- Policy: Companies can update their agents (e.g., approve/manage them)
CREATE POLICY "Companies can manage their agents"
ON public.agent
FOR UPDATE
TO authenticated
USING (company = auth.uid())
WITH CHECK (company = auth.uid());

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Index for faster agent lookups by company
CREATE INDEX IF NOT EXISTS idx_agent_company ON public.agent(company);

-- Index for faster agent lookups by email (unique constraint already exists)
-- CREATE INDEX IF NOT EXISTS idx_agent_email ON public.agent(email);

-- Index for faster company lookups by email (unique constraint already exists)
-- CREATE INDEX IF NOT EXISTS idx_company_email ON public.company(email);

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON POLICY "Agents can view their own profile" ON public.agent IS
'Allows agents to read their own profile data';

COMMENT ON POLICY "Agents can view their company" ON public.company IS
'Allows agents to view information about the company they belong to';

COMMENT ON POLICY "Companies can view their agents" ON public.agent IS
'Allows companies to view all agents that belong to them';

COMMENT ON POLICY "Companies can manage their agents" ON public.agent IS
'Allows companies to update agent profiles (e.g., approval status, permissions)';
