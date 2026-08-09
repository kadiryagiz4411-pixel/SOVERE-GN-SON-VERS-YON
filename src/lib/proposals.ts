import { supabase } from '@/integrations/supabase/client';

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
  const { data, error } = await supabase.functions.invoke('generate-proposal', {
    body: params,
  });

  if (error) {
    throw new Error(error.message || 'Failed to generate proposal');
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

  return data;
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
