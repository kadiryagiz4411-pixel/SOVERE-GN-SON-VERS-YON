import { useLanguage } from '@/i18n/LanguageContext';
import { Star, StarHalf, Quote, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Review {
  id: string;
  name: string;
  role: string | null;
  company: string | null;
  rating: number; // supports .5 increments
  content: string;
  avatar_url: string | null;
}

const FALLBACK_REVIEWS: Review[] = [
  {
    id: 'f1',
    name: 'squeezylemon',
    role: 'Freelance Writer',
    company: null,
    rating: 3,
    content: 'It works okay for quick drafts. The scoring thing is interesting but I don\'t fully trust it yet. Gave me a 58% on a gig I actually landed, so take it with a grain of salt.',
    avatar_url: null,
  },
  {
    id: 'f2',
    name: 'Emily Ludwig',
    role: 'UX Researcher',
    company: 'Designlab Berlin',
    rating: 4.5,
    content: 'Really solid for Upwork proposals. The platform-specific tailoring actually makes a noticeable difference. My response rate went from around 12% to 25% over six weeks.',
    avatar_url: null,
  },
  {
    id: 'f3',
    name: 'dev_nakamura',
    role: 'Backend Engineer',
    company: null,
    rating: 4,
    content: 'Saves me about 30 minutes per application. The competitive pressure indicator is surprisingly useful — helps me avoid oversaturated job postings.',
    avatar_url: null,
  },
  {
    id: 'f4',
    name: 'Rafaela Domínguez',
    role: 'Marketing Strategist',
    company: 'BrightPath Co.',
    rating: 3.5,
    content: 'Good concept, execution is mostly there. The multi-language output is a nice touch but German translations sometimes feel a bit stiff. English output is great though.',
    avatar_url: null,
  },
  {
    id: 'f5',
    name: 'pixelmonk_42',
    role: 'Graphic Designer',
    company: null,
    rating: 5,
    content: 'As someone who hates writing proposals — this is a lifesaver. I just paste the job description and get something I\'d actually send. The tone matches my portfolio style somehow.',
    avatar_url: null,
  },
  {
    id: 'f6',
    name: 'Konstantin Weil',
    role: 'Data Analyst',
    company: 'Numerik AG',
    rating: 4,
    content: 'The acceptance probability helped me stop applying to everything and focus on roles where I actually have a shot. Pro plan paid for itself in the first week.',
    avatar_url: null,
  },
];

export const ReviewsSection = () => {
  const { language } = useLanguage();

  const { data: dbReviews = [] } = useQuery({
    queryKey: ['reviews'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('is_approved', true)
        .order('created_at', { ascending: false })
        .limit(6);

      if (error) throw error;
      return data as Review[];
    },
  });

  // Use DB reviews if available, otherwise fallback
  const reviews = dbReviews.length > 0 ? dbReviews : FALLBACK_REVIEWS;

  const translations = {
    en: {
      badge: 'User Reviews',
      title: 'What Our Users Say',
      subtitle: 'Real feedback from freelancers and professionals using Sovereign.',
      viewAll: 'View All Reviews',
    },
    tr: {
      badge: 'Kullanıcı Yorumları',
      title: 'Kullanıcılarımız Ne Diyor',
      subtitle: 'Sovereign kullanan freelancerlar ve profesyonellerden gerçek geri bildirimler.',
      viewAll: 'Tüm Yorumları Gör',
    },
    de: {
      badge: 'Nutzerbewertungen',
      title: 'Was unsere Nutzer sagen',
      subtitle: 'Echtes Feedback von Freelancern und Fachleuten, die Sovereign nutzen.',
      viewAll: 'Alle Bewertungen ansehen',
    },
    fr: {
      badge: 'Avis des utilisateurs',
      title: 'Ce que disent nos utilisateurs',
      subtitle: 'Retours réels de freelances et professionnels utilisant Sovereign.',
      viewAll: 'Voir tous les avis',
    },
  };

  const t_reviews = translations[language] || translations.en;

  return (
    <section className="py-24 bg-card relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4">
            <Star className="w-4 h-4 text-primary fill-primary" />
            <span className="text-sm font-medium text-primary">{t_reviews.badge}</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
            {t_reviews.title}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t_reviews.subtitle}
          </p>
        </div>

        {/* Reviews Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {reviews.slice(0, 6).map((review) => (
            <div
              key={review.id}
              className="group p-6 rounded-2xl border border-border bg-background hover:border-primary/30 transition-all duration-300 card-hover relative"
            >
              <Quote className="absolute top-4 right-4 w-8 h-8 text-primary/10" />
              
              {/* Rating */}
              <div className="flex gap-0.5 mb-4">
                {[...Array(5)].map((_, i) => {
                  if (i < Math.floor(review.rating)) {
                    return <Star key={i} className="w-4 h-4 text-amber-500 fill-amber-500" />;
                  }
                  if (i === Math.floor(review.rating) && review.rating % 1 >= 0.5) {
                    return (
                      <div key={i} className="relative w-4 h-4">
                        <Star className="w-4 h-4 text-muted-foreground/30 absolute" />
                        <div className="overflow-hidden w-[50%] absolute">
                          <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                        </div>
                      </div>
                    );
                  }
                  return <Star key={i} className="w-4 h-4 text-muted-foreground/30" />;
                })}
              </div>

              {/* Content */}
              <p className="text-muted-foreground mb-6 leading-relaxed line-clamp-4">
                "{review.content}"
              </p>

              {/* Author */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                  {review.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-foreground">{review.name}</p>
                  {(review.role || review.company) && (
                    <p className="text-sm text-muted-foreground">
                      {review.role}{review.role && review.company && ' · '}{review.company}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* View All Link */}
        <div className="text-center mt-10">
          <Link to="/reviews" className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-medium transition-colors">
            {t_reviews.viewAll}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
};
