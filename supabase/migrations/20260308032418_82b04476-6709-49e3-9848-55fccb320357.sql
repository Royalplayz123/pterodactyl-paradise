
-- Create profile and resources for existing user who missed the trigger
INSERT INTO public.profiles (id, email, username, coins)
VALUES ('7530f8d3-f845-434e-9435-b85cc03a36a3', 'theselfvlogger1@gmail.com', 'theselfvlogger1', 100)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.user_resources (user_id)
VALUES ('7530f8d3-f845-434e-9435-b85cc03a36a3')
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO public.transactions (user_id, type, description, coins_change)
SELECT '7530f8d3-f845-434e-9435-b85cc03a36a3', 'signup_bonus', 'Welcome bonus coins', 100
WHERE NOT EXISTS (
  SELECT 1 FROM public.transactions 
  WHERE user_id = '7530f8d3-f845-434e-9435-b85cc03a36a3' AND type = 'signup_bonus'
);
