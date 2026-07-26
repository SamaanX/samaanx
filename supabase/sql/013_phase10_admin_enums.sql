-- Phase 10 — STEP 1 of 2 (run this FIRST, then run 013_phase10_admin_platform.sql)
-- PostgreSQL requires new enum values to be committed before use in the same session.

ALTER TYPE public."UserRole" ADD VALUE IF NOT EXISTS 'SUPER_ADMIN';

ALTER TYPE public."ReportType" ADD VALUE IF NOT EXISTS 'SPAM';
ALTER TYPE public."ReportType" ADD VALUE IF NOT EXISTS 'FAKE_LISTING';
ALTER TYPE public."ReportType" ADD VALUE IF NOT EXISTS 'HARASSMENT';
ALTER TYPE public."ReportType" ADD VALUE IF NOT EXISTS 'COPYRIGHT';
ALTER TYPE public."ReportType" ADD VALUE IF NOT EXISTS 'INAPPROPRIATE';
