
ALTER TABLE public.orders
  ADD COLUMN payment_method text NOT NULL DEFAULT 'cod',
  ADD COLUMN payment_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN upi_ref text,
  ADD COLUMN delivery_lat numeric,
  ADD COLUMN delivery_lng numeric,
  ADD COLUMN distance_km numeric;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_payment_method_check CHECK (payment_method IN ('cod','upi')),
  ADD CONSTRAINT orders_payment_status_check CHECK (payment_status IN ('pending','submitted','verified','failed','not_required'));

-- Allow customer to update their own order's UPI ref / payment_status to 'submitted' if not yet verified
CREATE POLICY "users submit upi ref"
ON public.orders
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id AND payment_status IN ('pending','submitted','failed'))
WITH CHECK (auth.uid() = user_id);
