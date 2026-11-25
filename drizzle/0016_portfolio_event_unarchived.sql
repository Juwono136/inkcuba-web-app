-- Allow restore/unarchive history events on student projects.

ALTER TYPE "portfolio_event_type" ADD VALUE IF NOT EXISTS 'UNARCHIVED';
