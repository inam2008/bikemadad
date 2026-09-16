CREATE POLICY "mechanic_ids_insert_own" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'mechanic-ids' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "mechanic_ids_select_own" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'mechanic-ids' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "mechanic_ids_update_own" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'mechanic-ids' AND (storage.foldername(name))[1] = auth.uid()::text);