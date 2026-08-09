import { useParams, Navigate } from 'react-router-dom';
import { AcceptanceRateSEOTemplate } from '@/components/seo/AcceptanceRateSEOTemplate';
import { getCompanyBySlug, getRoleBySlug } from '@/lib/seoData';

export const AcceptanceRatePage = () => {
  const { company, role } = useParams<{ company: string; role: string }>();
  const companyData = company ? getCompanyBySlug(company) : undefined;
  const roleData = role ? getRoleBySlug(role) : undefined;
  if (!companyData || !roleData) return <Navigate to="/" replace />;
  return <AcceptanceRateSEOTemplate company={companyData} role={roleData} />;
};
