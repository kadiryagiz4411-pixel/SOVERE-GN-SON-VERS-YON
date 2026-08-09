import { useParams, Navigate } from 'react-router-dom';
import { FreelanceSEOTemplate } from '@/components/seo/FreelanceSEOTemplate';
import { getProfessionById, getAllProfessions } from '@/lib/freelanceClusters';

export const UpworkProposalPage = () => {
  const { profession } = useParams<{ profession: string }>();
  const profData = profession ? getProfessionById(profession) : undefined;
  if (!profData) return <Navigate to="/" replace />;
  return <FreelanceSEOTemplate platform="upwork" profession={profData} />;
};

export const FiverrProposalPage = () => {
  const { profession } = useParams<{ profession: string }>();
  const profData = profession ? getProfessionById(profession) : undefined;
  if (!profData) return <Navigate to="/" replace />;
  return <FreelanceSEOTemplate platform="fiverr" profession={profData} />;
};

export const BestProposalPage = () => {
  const { profession } = useParams<{ profession: string }>();
  const profData = profession ? getProfessionById(profession) : undefined;
  if (!profData) return <Navigate to="/" replace />;
  return <FreelanceSEOTemplate platform="generic" profession={profData} />;
};
