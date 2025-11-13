-- Subscriptions Table
-- Manages user subscriptions, trials, and Stripe integration

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Status tracking
  -- 'trial' = User is in 7-day free trial
  -- 'active' = User has active paid subscription
  -- 'expired' = Trial or subscription has expired
  -- 'cancelled' = User cancelled subscription
  status TEXT NOT NULL DEFAULT 'trial' CHECK (status IN ('trial', 'active', 'expired', 'cancelled')),

  -- Trial tracking
  trial_ends_at TIMESTAMPTZ NOT NULL,

  -- Paid subscription tracking
  subscription_start_date TIMESTAMPTZ,
  subscription_end_date TIMESTAMPTZ,

  -- Stripe integration
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,

  -- Plan details
  plan_type TEXT CHECK (plan_type IN ('monthly', 'yearly', NULL)),
  plan_price_id TEXT,  -- Stripe price ID

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure one subscription per user
  CONSTRAINT unique_user_subscription UNIQUE(user_id)
);

-- Create index for faster lookups
CREATE INDEX idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX idx_subscriptions_stripe_customer ON public.subscriptions(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

-- Enable Row Level Security
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can view their own subscription
CREATE POLICY "Users can view own subscription"
  ON public.subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own subscription (needed for Stripe webhooks via service role)
CREATE POLICY "Users can update own subscription"
  ON public.subscriptions
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Service role can insert subscriptions (for signup process)
CREATE POLICY "Service role can insert subscriptions"
  ON public.subscriptions
  FOR INSERT
  WITH CHECK (true);

-- Service role can update any subscription (for Stripe webhooks)
CREATE POLICY "Service role can update subscriptions"
  ON public.subscriptions
  FOR UPDATE
  USING (true);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call the function
CREATE TRIGGER update_subscriptions_updated_at_trigger
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_subscriptions_updated_at();

-- Comment on table
COMMENT ON TABLE public.subscriptions IS 'User subscription management with 7-day trial and Stripe integration';
COMMENT ON COLUMN public.subscriptions.status IS 'Subscription status: trial, active, expired, or cancelled';
COMMENT ON COLUMN public.subscriptions.trial_ends_at IS '7 days after signup - when free trial expires';
COMMENT ON COLUMN public.subscriptions.stripe_customer_id IS 'Stripe customer ID for payment processing';
COMMENT ON COLUMN public.subscriptions.stripe_subscription_id IS 'Stripe subscription ID for active subscriptions';
