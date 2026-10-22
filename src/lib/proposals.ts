import { supabase } from '@/integrations/supabase/client';
import { EDGE_FUNCTIONS, invokeEdgeJson } from '@/lib/edgeFunctions';
import { postLiveProposal, readGeneratedText } from '@/lib/liveGenerate';

interface GenerateProposalParams {
  jobDescription: string;
  userProfile?: {
    skills?: string[] | null;
    experience?: string | null;
    hourly_rate?: number | null;
  };
}

interface GenerateProposalResponse {
  proposal: string;
  usage: {
    used: number;
    limit: number;
    remaining: number;
  };
}

export const generateProposal = async (
  params: GenerateProposalParams
): Promise<GenerateProposalResponse> => {
  const live = await postLiveProposal(params as unknown as Record<string, unknown>);
  const liveText = readGeneratedText(live.data, ['proposal', 'proposalText', 'text']);
  if (live.ok && liveText) {
    return {
      proposal: liveText,
      usage: { used: 0, limit: 0, remaining: 0 },
    };
  }

  const { data, error, status } = await invokeEdgeJson<GenerateProposalResponse & { error?: string; upgradeMessage?: string; limit?: number; used?: number }>(
    EDGE_FUNCTIONS.proposal,
    params,
  );

  if (error || !data) {
    console.error('[generate-proposal] invoke error', { status, error });
    throw new Error(error || 'Failed to generate proposal');
  }

  if (data.error) {
    const err = new Error(data.error) as Error & { 
      upgradeMessage?: string;
      limit?: number;
      used?: number;
    };
    err.upgradeMessage = data.upgradeMessage;
    err.limit = data.limit;
    err.used = data.used;
    throw err;
  }

  const edgeText = readGeneratedText(data, ['proposal', 'proposalText', 'text']);
  if (!edgeText) {
    throw new Error(live.error || 'Failed to generate proposal');
  }
  return { ...data, proposal: edgeText };
};

export const saveProposal = async (
  userId: string,
  jobDescription: string,
  generatedProposal: string
) => {
  const { data, error } = await supabase
    .from('proposals')
    .insert({
      user_id: userId,
      job_description: jobDescription,
      generated_proposal: generatedProposal,
      status: 'approved',
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
};

export const getRecentProposals = async (userId: string, limit = 10) => {
  const { data, error } = await supabase
    .from('proposals')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return data;
};
