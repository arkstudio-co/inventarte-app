CREATE TABLE community_companies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  logo_url TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE community_companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Community companies public read" ON community_companies
  FOR SELECT USING (true);

CREATE POLICY "Community companies admin insert" ON community_companies
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Community companies admin update" ON community_companies
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Community companies admin delete" ON community_companies
  FOR DELETE USING (auth.role() = 'authenticated');
