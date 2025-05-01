-- Add subscription-related fields to user_profiles
ALTER TABLE user_profiles
ADD COLUMN stripe_customer_id TEXT,
ADD COLUMN subscription_id TEXT,
ADD COLUMN subscription_status TEXT,
ADD COLUMN subscription_plan_id TEXT,
ADD COLUMN subscription_current_period_end TIMESTAMP WITH TIME ZONE;

-- Create index for faster lookups
CREATE INDEX idx_user_profiles_stripe_customer_id ON user_profiles(stripe_customer_id);
CREATE INDEX idx_user_profiles_subscription_id ON user_profiles(subscription_id); 