// Public, build-time configuration only. Never put credentials in PUBLIC_* values.
export const leadConfig = {
  mode: import.meta.env.PUBLIC_LEAD_MODE === 'live' ? 'live' : 'demo',
  projectId: (import.meta.env.PUBLIC_LEAD_PROJECT_ID || '').trim(),
  formId: (import.meta.env.PUBLIC_LEAD_FORM_ID || '').trim(),
  timeoutMs: 15000,
};

// The same compiled LP can be served at any extensionless runtime mount.
// Use pathname only: query strings, fragments and build settings cannot select
// another origin or route. Normalize slashes to keep the result origin-relative.
export function resolveLeadEndpoint(pathname: string) {
  const mount = pathname.replace(/\/index\.html$/, '').split('/').filter(Boolean).join('/');
  return `/${mount ? `${mount}/` : ''}api/lead`;
}

// Fail closed: a live integration must be explicitly selected and customer configured.
export function hasLiveLeadService() {
  return leadConfig.mode === 'live' && Boolean(leadConfig.projectId && leadConfig.formId);
}
