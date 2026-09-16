CREATE TYPE public.app_role AS ENUM ('customer','mechanic');
CREATE TYPE public.request_status AS ENUM ('pending','accepted','on_the_way','completed','cancelled');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'customer',
  full_name text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  cnic text,
  id_photo_url text,
  is_online boolean NOT NULL DEFAULT false,
  lat double precision,
  lng double precision,
  location_updated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_select_mechanics" ON public.profiles FOR SELECT TO authenticated USING (role = 'mechanic');
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TABLE public.service_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mechanic_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  problem_type text NOT NULL,
  problem_note text,
  bike_model text,
  bike_reg_no text,
  landmark text,
  customer_name text,
  customer_phone text,
  lat double precision,
  lng double precision,
  status public.request_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_requests TO authenticated;
GRANT ALL ON public.service_requests TO service_role;
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "requests_select_own" ON public.service_requests FOR SELECT TO authenticated
  USING (auth.uid() = customer_id OR auth.uid() = mechanic_id OR (status = 'pending' AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'mechanic')));
CREATE POLICY "requests_insert_own" ON public.service_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = customer_id);
CREATE POLICY "requests_update_party" ON public.service_requests FOR UPDATE TO authenticated
  USING (auth.uid() = customer_id OR auth.uid() = mechanic_id OR (status = 'pending' AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'mechanic')))
  WITH CHECK (auth.uid() = customer_id OR auth.uid() = mechanic_id);

CREATE TABLE public.parts_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  name_en text NOT NULL,
  name_ur text NOT NULL,
  price_min integer NOT NULL,
  price_max integer NOT NULL,
  unit text NOT NULL DEFAULT 'PKR',
  sort_order integer NOT NULL DEFAULT 0
);
GRANT SELECT ON public.parts_prices TO anon;
GRANT SELECT ON public.parts_prices TO authenticated;
GRANT ALL ON public.parts_prices TO service_role;
ALTER TABLE public.parts_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "parts_public_read" ON public.parts_prices FOR SELECT USING (true);

CREATE TABLE public.phone_otps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  code text NOT NULL,
  channel text NOT NULL DEFAULT 'sms',
  attempts integer NOT NULL DEFAULT 0,
  consumed_at timestamptz,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.phone_otps TO service_role;
ALTER TABLE public.phone_otps ENABLE ROW LEVEL SECURITY;
CREATE INDEX phone_otps_phone_idx ON public.phone_otps (phone, created_at DESC);

CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;
CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER requests_touch BEFORE UPDATE ON public.service_requests FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER PUBLICATION supabase_realtime ADD TABLE public.service_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER TABLE public.profiles REPLICA IDENTITY FULL;
ALTER TABLE public.service_requests REPLICA IDENTITY FULL;

INSERT INTO public.parts_prices (category, name_en, name_ur, price_min, price_max, sort_order) VALUES
('Tyres & Tubes','Tyre (Tube type, 17 inch)','ٹائر (ٹیوب والا، ۱۷ انچ)',2200,4200,1),
('Tyres & Tubes','Inner Tube','ٹیوب',450,900,2),
('Tyres & Tubes','Puncture Repair (per patch)','پنکچر مرمت (فی پیوند)',150,300,3),
('Engine & Oil','Engine Oil (700ml, mineral)','انجن آئل (۷۰۰ ملی لیٹر)',550,1100,4),
('Engine & Oil','Engine Oil (Semi synthetic)','انجن آئل (سیمی سنتھیٹک)',1200,2400,5),
('Engine & Oil','Oil Filter / Strainer','آئل فلٹر',250,600,6),
('Engine & Oil','Piston Ring Set','پسٹن رنگ سیٹ',900,2200,7),
('Engine & Oil','Clutch Plate Set','کلچ پلیٹ سیٹ',900,2500,8),
('Brakes','Brake Shoe Set (Rear)','بریک شو سیٹ (پچھلا)',450,1100,9),
('Brakes','Brake Pad Set (Disc)','بریک پیڈ سیٹ (ڈسک)',700,1800,10),
('Brakes','Brake Cable','بریک کیبل',250,500,11),
('Electrical','Battery (2.5 Ah dry)','بیٹری (۲.۵ ایمپیئر)',1800,3500,12),
('Electrical','Spark Plug','سپارک پلگ',250,750,13),
('Electrical','Self Start Motor','سیلف اسٹارٹ موٹر',2500,5500,14),
('Electrical','Headlight Bulb','ہیڈ لائٹ بلب',200,600,15),
('Electrical','Indicator Set','انڈیکیٹر سیٹ',400,1000,16),
('Drive & Chain','Chain & Sprocket Kit','چین اور سپروکیٹ کٹ',1500,3800,17),
('Drive & Chain','Chain Lubrication & Tighten','چین تیل اور کسائی',200,400,18),
('Body & Others','Side Mirror (pair)','سائیڈ مرر (جوڑا)',450,1200,19),
('Body & Others','Seat Cover','سیٹ کور',600,1600,20),
('Body & Others','Clutch / Brake Lever','کلچ / بریک لیور',300,800,21),
('Body & Others','Petrol Tank Cap','پیٹرول ٹینک کیپ',250,700,22),
('Labour','Mechanic Visit Charges (on-site)','مکینک وزٹ چارجز',300,600,23),
('Labour','Engine Tuning','انجن ٹیوننگ',500,1200,24);