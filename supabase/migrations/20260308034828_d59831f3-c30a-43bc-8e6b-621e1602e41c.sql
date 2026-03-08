
ALTER TABLE public.user_resources
  ADD COLUMN IF NOT EXISTS databases INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS backups INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS allocations INTEGER NOT NULL DEFAULT 1;

-- Add default shop items for the new resources
INSERT INTO public.shop_items (name, description, icon, price, resource, amount, display_amount, color, sort_order) VALUES
  ('+1 Database', 'Extra database for your server', 'database', 30, 'databases', 1, '1 database', 'text-accent', 8),
  ('+1 Backup', 'Extra backup slot for your server', 'archive', 25, 'backups', 1, '1 backup', 'text-warning', 9),
  ('+1 Allocation', 'Extra port allocation for your server', 'network', 35, 'allocations', 1, '1 allocation', 'text-success', 10);
