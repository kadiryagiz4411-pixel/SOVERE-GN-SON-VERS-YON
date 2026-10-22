-- Live Apply Queue: broadcast inserts/updates from web + extension to open dashboards.
DO $$
BEGIN
  ALTER TABLE public.apply_queue REPLICA IDENTITY FULL;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'apply_queue'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.apply_queue;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;
