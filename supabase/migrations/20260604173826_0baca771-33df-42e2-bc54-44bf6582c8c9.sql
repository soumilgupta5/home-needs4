
-- Lock down EXECUTE on definer functions
REVOKE EXECUTE ON FUNCTION public.apply_points(UUID,INTEGER,public.points_source,NUMERIC,TEXT,UUID,UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.award_instore_points(UUID,NUMERIC,TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.finalize_order_points(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_role(UUID,public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.award_instore_points(UUID,NUMERIC,TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_order_points(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(UUID,public.app_role) TO authenticated;

-- Seed products
INSERT INTO public.products(name, name_hi, category, price_inr, stock) VALUES
('Stainless Steel Pressure Cooker 3L','स्टील प्रेशर कुकर 3 लीटर','Kitchen',1199,40),
('Non-Stick Tawa 28cm','नॉन-स्टिक तवा 28सेमी','Kitchen',549,60),
('Casserole Hot Pot 2L','कैसरोल हॉट पॉट 2 लीटर','Kitchen',699,30),
('Steel Tiffin Box 4 Container','स्टील टिफिन 4 डिब्बा','Kitchen',449,80),
('Chopping Board Plastic','प्लास्टिक चॉपिंग बोर्ड','Kitchen',179,120),
('Knife Set 6pc','चाकू सेट 6 पीस','Kitchen',389,50),
('Glass Tumbler Set of 6','ग्लास टम्बलर सेट','Kitchen',299,90),
('Surf Excel Matic 1kg','सर्फ एक्सेल मैटिक 1किग्रा','Cleaning',299,200),
('Vim Dishwash Bar 4pc','विम बर्तन बार 4 पीस','Cleaning',60,300),
('Harpic Toilet Cleaner 1L','हार्पिक टॉयलेट क्लीनर','Cleaning',180,150),
('Lizol Floor Cleaner 975ml','लाइज़ोल फ्लोर क्लीनर','Cleaning',220,150),
('Microfiber Cleaning Cloth 5pc','माइक्रोफाइबर कपड़ा 5 पीस','Cleaning',149,180),
('Broom Soft Bristle','नरम झाड़ू','Cleaning',129,100),
('Mop with Bucket Set','पोछा बाल्टी सेट','Cleaning',899,40),
('Plastic Storage Box 20L','प्लास्टिक स्टोरेज बॉक्स 20एल','Storage',499,60),
('Airtight Container Set 6pc','एयरटाइट कंटेनर सेट 6 पीस','Storage',649,70),
('Steel Storage Drum 25kg','स्टील डिब्बा 25किग्रा','Storage',1499,25),
('Foldable Laundry Basket','फोल्डेबल लॉन्ड्री बास्केट','Storage',349,80),
('Spice Rack 12 Jars','मसाला रैक 12 जार','Storage',799,40),
('Wall Hanging Rack 3 Shelf','दीवार रैक 3 शेल्फ','Storage',1099,30);
