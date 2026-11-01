ALTER TABLE public.inquiries ADD COLUMN IF NOT EXISTS inquiry_summary text;
ALTER TABLE public.inquiries ADD COLUMN IF NOT EXISTS inquiry_summary_msg_count integer;