-- Test data for Opptak purchase debugging
-- Insert a sample ensemble with recordings

INSERT INTO public.ensembles (
  id, title, slug, description, recording_price_nok, is_published, yellow_team_name, blue_team_name
) VALUES (
  'test-ensemble-id', 
  'Test Ensemble', 
  'test-ensemble', 
  'Test ensemble for debugging Opptak purchases',
  100.00,
  true,
  'Gult test-lag',
  'Blått test-lag'
) ON CONFLICT (slug) DO UPDATE SET
  recording_price_nok = 100.00,
  is_published = true;

-- Insert test recordings for both teams
INSERT INTO public.recordings (
  id, ensemble_id, team, description, jottacloud_embed_url, quality
) VALUES 
  ('test-recording-yellow', 'test-ensemble-id', 'yellow', 'Test Yellow Recording', 'https://example.com/yellow', '1080p'),
  ('test-recording-blue', 'test-ensemble-id', 'blue', 'Test Blue Recording', 'https://example.com/blue', '1080p')
ON CONFLICT (id) DO NOTHING;