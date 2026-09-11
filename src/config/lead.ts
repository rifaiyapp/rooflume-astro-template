// Public, build-time configuration only. Never put credentials in PUBLIC_* values.
export const leadConfig = {
  mode: import.meta.env.PUBLIC_LEAD_MODE === 'live' ? 'live' : 'demo',
  endpoint: (import.meta.env.PUBLIC_LEAD_ENDPOINT || '').trim(),
  projectId: (import.meta.env.PUBLIC_LEAD_PROJECT_ID || '').trim(),
  formId: (import.meta.env.PUBLIC_LEAD_FORM_ID || '').trim(),
  timeoutMs: 15000,
};

// Fail closed: a live integration must be explicitly selected and customer configured.
export function hasLiveLeadService() {
  if (leadConfig.mode !== 'live' || !leadConfig.projectId || !leadConfig.formId) return false;
  try {
    const url = new URL(leadConfig.endpoint);
    return url.protocol === 'https:' && !url.username && !url.password && !url.hash;
  } catch { return false; }
}
