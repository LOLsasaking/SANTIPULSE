const groups = {
  core: ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_ANON_KEY'],
  receptionistLeads: ['VAPI_API_KEY', 'VAPI_ASSISTANT_ID', 'BLAND_API_KEY', 'WHATSAPP_ACCESS_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID', 'CALENDAR_PROVIDER', 'CALENDAR_API_KEY'],
  socialInsightsAutoposter: ['META_APP_ID', 'META_APP_SECRET', 'META_ACCESS_TOKEN', 'TIKTOK_CLIENT_KEY', 'TIKTOK_CLIENT_SECRET', 'SOCIAL_TREND_WORKER_SECRET'],
  autoAdManager: ['META_AD_ACCOUNT_ID', 'TIKTOK_ADVERTISER_ID', 'TIKTOK_ACCESS_TOKEN', 'AD_MANAGER_WORKER_SECRET']
};

for (const [group, vars] of Object.entries(groups)) {
  console.log(`\n[${group}]`);
  for (const key of vars) console.log(`${process.env[key] ? '✓' : '○'} ${key}`);
}

console.log('\nApply supabase/admin-modular.sql before turning on live CRM, social publishing, or ad-management writes.');
