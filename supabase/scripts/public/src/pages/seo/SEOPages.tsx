import { useParams, Navigate } from 'react-router-dom';
import { SEOPageTemplate } from '@/components/seo/SEOPageTemplate';
import { getCompanyBySlug, getRoleBySlug } from '@/lib/seoData';

export const GetHiredAtPage = () => {
  const { company } = useParams<{ company: string }>();
  const companyData = company ? getCompanyBySlug(company) : undefined;
  if (!companyData) return <Navigate to="/" replace />;
  return <SEOPageTemplate type="get-hired" company={companyData} />;
};

export const HowToGetJobPage = () => {
  const { company } = useParams<{ company: string }>();
  const companyData = company ? getCompanyBySlug(company) : undefined;
  if (!companyData) return <Navigate to="/" replace />;
  return <SEOPageTemplate type="how-to-get" company={companyData} />;
};

export const ResumeForPage = () => {
  const { company, role } = useParams<{ company: string; role: string }>();
  const companyData = company ? getCompanyBySlug(company) : undefined;
  const roleData = role ? getRoleBySlug(role) : undefined;
  if (!companyData && !roleData) return <Navigate to="/" replace />;
  return <SEOPageTemplate type="resume-for" company={companyData} role={roleData} />;
};

export const ATSCheckerPage = () => {
  const { role } = useParams<{ role: string }>();
  const roleData = role ? getRoleBySlug(role) : undefined;
  if (!roleData) return <Navigate to="/" replace />;
  return <SEOPageTemplate type="ats-checker" role={roleData} />;
};

export const BestResumePage = () => {
  const { role } = useParams<{ role: string }>();
  const roleData = role ? getRoleBySlug(role) : undefined;
  if (!roleData) return <Navigate to="/" replace />;
  return <SEOPageTemplate type="best-resume" role={roleData} />;
};
