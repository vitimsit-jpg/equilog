-- Add multi-image support to listings
ALTER TABLE listings ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}';
