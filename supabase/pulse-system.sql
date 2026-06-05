-- Pulse System final setup.
-- Run this after the existing setup.sql / automation.sql files.

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS gdpr_consent BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS gdpr_consent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS privacy_version TEXT;

COMMENT ON COLUMN leads.gdpr_consent IS 'True when the visitor accepted the Santipulse privacy policy before submitting.';
COMMENT ON COLUMN leads.gdpr_consent_at IS 'Server-side timestamp for privacy consent.';
COMMENT ON COLUMN leads.privacy_version IS 'Privacy policy version accepted by the lead.';

COMMENT ON COLUMN automation_jobs.automation_type IS
  'Pulse module id: ai_receptionist, social_insights, or ad_manager. Legacy demos are archived in backend-archive.';
