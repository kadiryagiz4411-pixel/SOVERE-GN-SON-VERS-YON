import { useParams, Navigate } from 'react-router-dom';
import { LanguageSEOTemplate } from '@/components/seo/LanguageSEOTemplate';
import { getProfessionById } from '@/lib/freelanceClusters';
import { getRoleBySlug } from '@/lib/seoData';
import { getLanguageBySlug } from '@/lib/seoLanguages';

export const ProposalLanguagePage = () => {
  const { profession, language } = useParams<{ profession: string; language: string }>();
  const profData = profession ? getProfessionById(profession) : undefined;
  const langData = language ? getLanguageBySlug(language) : undefined;
  if (!profData || !langData) return <Navigate to="/" replace />;
  return <LanguageSEOTemplate type="proposal" profession={profData} language={langData} />;
};

export const ResumeLanguagePage = () => {
  const { role, language } = useParams<{ role: string; language: string }>();
  const roleData = role ? getRoleBySlug(role) : undefined;
  const langData = language ? getLanguageBySlug(language) : undefined;
  if (!roleData || !langData) return <Navigate to="/" replace />;
  return <LanguageSEOTemplate type="resume" role={roleData} language={langData} />;
};

export const ProposalTemplatePage = () => {
  const { profession, language } = useParams<{ profession: string; language: string }>();
  const profData = profession ? getProfessionById(profession) : undefined;
  const langData = language ? getLanguageBySlug(language) : undefined;
  if (!profData || !langData) return <Navigate to="/" replace />;
  return <LanguageSEOTemplate type="template" profession={profData} language={langData} />;
};
