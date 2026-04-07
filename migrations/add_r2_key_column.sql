-- Migration: Add r2_key column to tank_documents table for Cloudflare R2 integration
-- Date: 2026-04-07
-- Purpose: Enable R2 object storage with signed URL support

BEGIN;

-- Add r2_key column to tank_documents table
ALTER TABLE tank_documents 
ADD COLUMN r2_key VARCHAR(512) NULL;

-- Add comment for documentation
COMMENT ON COLUMN tank_documents.r2_key IS 'Cloudflare R2 object key for document storage';

-- Create index for faster R2 key lookups
CREATE INDEX idx_tank_documents_r2_key ON tank_documents(r2_key) WHERE r2_key IS NOT NULL;

COMMIT;