-- Phase 13.1: trigram GIN indexes for ILIKE substring search (Prisma `contains` + insensitive)
-- Run in Supabase SQL editor after 023_phase13_perf_indexes.sql
-- Requires pg_trgm (available on Supabase Postgres by default)

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Marketplace search (title, description, city, area)
CREATE INDEX IF NOT EXISTS idx_listings_title_trgm
  ON listings USING gin (title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_listings_description_trgm
  ON listings USING gin (description gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_listings_city_trgm
  ON listings USING gin (city gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_listings_area_trgm
  ON listings USING gin (area gin_trgm_ops);

-- Seller name in marketplace OR filters
CREATE INDEX IF NOT EXISTS idx_profiles_display_name_trgm
  ON profiles USING gin (display_name gin_trgm_ops);

-- Category name search in marketplace OR
CREATE INDEX IF NOT EXISTS idx_categories_name_trgm
  ON categories USING gin (name gin_trgm_ops);

-- Admin / wishlist substring search (lower-traffic but same query pattern)
CREATE INDEX IF NOT EXISTS idx_profiles_email_trgm
  ON profiles USING gin (email gin_trgm_ops);
