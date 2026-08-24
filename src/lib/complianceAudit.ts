import { supabase } from '@/integrations/supabase/client';

export interface ComplianceAuditEntry {
  id?: string;
  action: string;
  resource_type?: string;
  resource_id?: string;
  legal_basis?: string;
  metadata?: Record<string, unknown>;
  created_at?: string;
}

const LOCAL_KEY = 'sovereign_compliance_audit_logs';

function readLocal(): ComplianceAuditEntry[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeLocal(entries: ComplianceAuditEntry[]) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(entries.slice(0, 200)));
}

export async function logComplianceEvent(entry: ComplianceAuditEntry): Promise<void> {
  const payload = {
    action: entry.action,
    resource_type: entry.resource_type ?? null,
    resource_id: entry.resource_id ?? null,
    legal_basis: entry.legal_basis ?? 'GDPR Art. 6(1)(f) / KVKK Art. 5',
    metadata: entry.metadata ?? {},
    created_at: new Date().toISOString(),
  };

  const local = readLocal();
  local.unshift({ ...payload, id: crypto.randomUUID() });
  writeLocal(local);

  try {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('compliance_audit_logs' as never).insert({
      ...payload,
      user_id: user?.id ?? null,
    } as never);
  } catch {
    // Local log is enough if the remote table is unavailable.
  }
}

export async function fetchComplianceLogs(): Promise<ComplianceAuditEntry[]> {
  try {
    const { data, error } = await supabase
      .from('compliance_audit_logs' as never)
      .select('id, action, resource_type, resource_id, legal_basis, metadata, created_at')
      .order('created_at', { ascending: false })
      .limit(50);
    if (!error && Array.isArray(data) && data.length > 0) {
      return data as ComplianceAuditEntry[];
    }
  } catch {
    // fall through to local
  }
  return readLocal();
}

export function downloadComplianceExport(entries: ComplianceAuditEntry[]): void {
  const lines = [
    '# Sovereign GDPR / KVKK Compliance Audit Export',
    `# Generated: ${new Date().toISOString()}`,
    '# Legal basis: GDPR Art. 6(1)(f) legitimate interest / KVKK Art. 5',
    '',
    'timestamp,action,resource_type,resource_id,legal_basis',
    ...entries.map((e) =>
      [
        e.created_at ?? '',
        e.action,
        e.resource_type ?? '',
        e.resource_id ?? '',
        e.legal_basis ?? '',
      ].map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','),
    ),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `sovereign-gdpr-kvkk-audit-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
