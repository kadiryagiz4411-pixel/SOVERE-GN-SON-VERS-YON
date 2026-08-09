// Analytics event tracker — integrates with GA4 via gtag
// Gracefully degrades if GA is not loaded

type EventName =
  | 'cta_click'
  | 'signup_start'
  | 'signup_complete'
  | 'upgrade_click'
  | 'resume_generated'
  | 'proposal_generated'
  | 'score_viewed'
  | 'scroll_depth'
  | 'exit_intent_shown'
  | 'exit_intent_converted'
  | 'email_capture'
  // Segment & Freelance tracking
  | 'segment_selected'
  | 'platform_selected'
  | 'cluster_selected'
  | 'profession_selected'
  | 'freelance_score_viewed'
  | 'output_language_changed'
  | 'cultural_tone_changed'
  | 'proposal_regenerated'
  | 'proposal_exported'
  | 'proposal_copied'
  | 'upgrade_prompt_shown'
  | 'upgrade_prompt_clicked'
  // Landing page conversion tracking
  | 'demo_generate_click'
  | 'demo_to_signup'
  | 'hero_cta_click'
  | 'acceptance_predictor_start'
  | 'acceptance_predictor_reveal_cta'
  | 'acceptance_predictor_file_drop'
  // Email funnel tracking
  | 'acceptance_score_page_view'
  | 'lead_form_submit'
  | 'popup_submit'
  | 'user_registered'
  | 'user_upgraded';

interface EventParams {
  label?: string;
  value?: number | string;
  plan?: string;
  source?: string;
}

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

export const trackEvent = (name: EventName, params?: EventParams) => {
  try {
    if (typeof window.gtag === 'function') {
      window.gtag('event', name, {
        event_category: 'conversion',
        event_label: params?.label,
        value: params?.value,
        plan: params?.plan,
        source: params?.source,
      });
    }
    // Also log in dev
    if (import.meta.env.DEV) {
      console.log(`[Analytics] ${name}`, params);
    }
  } catch {
    // silently ignore
  }
};

export const initScrollDepthTracking = () => {
  const milestones = new Set<number>();
  const checkDepth = () => {
    const scrolled = window.scrollY + window.innerHeight;
    const total = document.documentElement.scrollHeight;
    const percent = Math.round((scrolled / total) * 100);
    [25, 50, 75, 90].forEach((milestone) => {
      if (percent >= milestone && !milestones.has(milestone)) {
        milestones.add(milestone);
        trackEvent('scroll_depth', { value: milestone, label: `${milestone}%` });
      }
    });
  };
  window.addEventListener('scroll', checkDepth, { passive: true });
  return () => window.removeEventListener('scroll', checkDepth);
};
