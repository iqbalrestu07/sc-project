-- Create storage bucket for CMS images
INSERT INTO storage.buckets (id, name, public)
VALUES ('cms-images', 'cms-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for cms-images bucket
-- Allow public read access for all images
CREATE POLICY "Public read access for CMS images"
ON storage.objects FOR SELECT
USING (bucket_id = 'cms-images');

-- Allow authenticated users to upload images
CREATE POLICY "Authenticated users can upload CMS images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'cms-images');

-- Allow authenticated users to update their uploads
CREATE POLICY "Authenticated users can update CMS images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'cms-images');

-- Allow authenticated users to delete images
CREATE POLICY "Authenticated users can delete CMS images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'cms-images');