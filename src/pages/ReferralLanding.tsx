import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

/** Stores a referral code and sends the visitor to sign up. No credits are spent here. */
export default function ReferralLanding() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    try {
      const code = String(params.get('code') || params.get('ref') || '').trim();
      if (/^[A-Za-z0-9_-]{4,32}$/.test(code)) {
        localStorage.setItem('affiliate_ref', code);
      }
    } catch (err) {
      console.error('[sovereign] referral landing', err);
    }
    navigate('/auth?mode=signup', { replace: true });
  }, [navigate, params]);

  return null;
}
