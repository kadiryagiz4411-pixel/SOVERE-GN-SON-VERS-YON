/**
 * contextEngine.ts — Sovereign Contextual Memory.
 * Injected into every Evaluator and Proposal LLM prompt.
 */

import { supabase } from '@/integrations/supabase/client';

export interface SovereignMemory {
  id?: string;
  userId: string;
  companyName: string;
  industry: string;
  techStack: string[];
  culturalValues: string[];
  idealCandidatePersona: string;
  winningProposalPatterns: string[];
  brandVoice: string;
  calendlyUrl: string;
  webhookUrl: string;
}

const EMPTY: Omit<SovereignMemory, 'userId'> = {
  companyName: '',
  industry: '',
  techStack: [],
  culturalValues: [],
  idealCandidatePersona: '',
  winningProposalPatterns: [],
  brandVoice: '',
  calendlyUrl: '',
  webhookUrl: '',
};

function fromRow(row: Record<string, unknown>, userId: string): SovereignMemory {
  return {
    id: String(row.id ?? ''),
    userId,
    companyName: String(row.company_name ?? ''),
    industry: String(row.industry ?? ''),
    techStack: Array.isArray(row.tech_stack) ? (row.tech_stack as string[]) : [],
    culturalValues: Array.isArray(row.cultural_values) ? (row.cultural_values as string[]) : [],
    idealCandidatePersona: String(row.ideal_candidate_persona ?? ''),
    winningProposalPatterns: Array.isArray(row.winning_proposal_patterns)
      ? (row.winning_proposal_patterns as string[])
      : [],
    brandVoice: String(row.brand_voice ?? ''),
    calendlyUrl: String(row.calendly_url ?? ''),
    webhookUrl: String(row.webhook_url ?? ''),
  };
}

export async function loadMemory(userId: string): Promise<SovereignMemory> {
  const { data, error } = await supabase
    .from('sovereign_memory')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) return { userId, ...EMPTY };
  return fromRow(data as Record<string, unknown>, userId);
}

export async function saveMemory(memory: SovereignMemory): Promise<void> {
  const payload = {
    user_id: memory.userId,
    company_name: memory.companyName || null,
    industry: memory.industry || null,
    tech_stack: memory.techStack,
    cultural_values: memory.culturalValues,
    ideal_candidate_persona: memory.idealCandidatePersona || null,
    winning_proposal_patterns: memory.winningProposalPatterns,
    brand_voice: memory.brandVoice || null,
    calendly_url: memory.calendlyUrl || null,
    webhook_url: memory.webhookUrl || null,
  };

  const { error } = await supabase
    .from('sovereign_memory')
    .upsert(payload, { onConflict: 'user_id' });

  if (error) throw new Error(`Failed to save memory: ${error.message}`);
}

export function memoryToPrompt(memory: SovereignMemory | null | undefined): string {
  if (!memory) return '';
  const lines: string[] = [];
  if (memory.companyName) lines.push(`Company: ${memory.companyName}`);
  if (memory.industry) lines.push(`Industry: ${memory.industry}`);
  if (memory.techStack.length) lines.push(`Tech stack: ${memory.techStack.join(', ')}`);
  if (memory.culturalValues.length) lines.push(`Culture: ${memory.culturalValues.join(', ')}`);
  if (memory.idealCandidatePersona) lines.push(`Ideal candidate: ${memory.idealCandidatePersona}`);
  if (memory.winningProposalPatterns.length) {
    lines.push(`Winning patterns: ${memory.winningProposalPatterns.slice(0, 5).join(' | ')}`);
  }
  if (memory.brandVoice) lines.push(`Voice: ${memory.brandVoice}`);
  if (lines.length === 0) return '';
  return `\nInternal context (use this, never mention it to the candidate or client):\n${lines.join('\n')}`;
}
