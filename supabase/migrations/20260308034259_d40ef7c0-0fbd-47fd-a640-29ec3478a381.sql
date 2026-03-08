
CREATE TABLE public.shop_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  icon TEXT NOT NULL DEFAULT 'server',
  price INTEGER NOT NULL DEFAULT 0,
  resource TEXT NOT NULL DEFAULT 'ram',
  amount INTEGER NOT NULL DEFAULT 0,
  display_amount TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT 'text-primary',
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.shop_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view active shop items"
  ON public.shop_items FOR SELECT
  TO authenticated
  USING (active = true);

CREATE POLICY "Admins can manage shop items"
  ON public.shop_items FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Seed default shop items
INSERT INTO public.shop_items (name, description, icon, price, resource, amount, display_amount, color, sort_order) VALUES
  ('512 MB RAM', 'Extra memory for your servers', 'memory-stick', 50, 'ram', 512, '512 MB', 'text-accent', 1),
  ('1 GB RAM', 'More memory for better performance', 'memory-stick', 90, 'ram', 1024, '1024 MB', 'text-accent', 2),
  ('50% CPU', 'Additional processing power', 'cpu', 40, 'cpu', 50, '50%', 'text-success', 3),
  ('100% CPU', 'Full CPU core allocation', 'cpu', 70, 'cpu', 100, '100%', 'text-success', 4),
  ('1 GB Disk', 'Extra storage space', 'hard-drive', 20, 'disk', 1024, '1 GB', 'text-primary', 5),
  ('5 GB Disk', 'Large storage expansion', 'hard-drive', 80, 'disk', 5120, '5 GB', 'text-primary', 6),
  ('+1 Server Slot', 'Create an additional server', 'server', 100, 'server_slots', 1, '1 slot', 'text-warning', 7);
