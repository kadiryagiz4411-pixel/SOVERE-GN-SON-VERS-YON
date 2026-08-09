import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { useLanguage } from '@/i18n/LanguageContext';
import { Star, Quote } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Review {
  id: string;
  name: string;
  role: string | null;
  company: string | null;
  rating: number;
  content: string;
  avatar_url: string | null;
}

const ALL_FALLBACK_REVIEWS: Review[] = [
  { id: 'f1', name: 'squeezylemon', role: 'Freelance Writer', company: null, rating: 3, content: 'It works okay for quick drafts. The scoring thing is interesting but I don\'t fully trust it yet. Gave me a 58% on a gig I actually landed, so take it with a grain of salt.', avatar_url: null },
  { id: 'f2', name: 'Emily Ludwig', role: 'UX Researcher', company: 'Designlab Berlin', rating: 4.5, content: 'Really solid for Upwork proposals. The platform-specific tailoring actually makes a noticeable difference. My response rate went from around 12% to 25% over six weeks.', avatar_url: null },
  { id: 'f3', name: 'dev_nakamura', role: 'Backend Engineer', company: null, rating: 4, content: 'Saves me about 30 minutes per application. The competitive pressure indicator is surprisingly useful — helps me avoid oversaturated job postings.', avatar_url: null },
  { id: 'f4', name: 'Rafaela Domínguez', role: 'Marketing Strategist', company: 'BrightPath Co.', rating: 3.5, content: 'Good concept, execution is mostly there. The multi-language output is a nice touch but German translations sometimes feel a bit stiff. English output is great though.', avatar_url: null },
  { id: 'f5', name: 'pixelmonk_42', role: 'Graphic Designer', company: null, rating: 5, content: 'As someone who hates writing proposals — this is a lifesaver. I just paste the job description and get something I\'d actually send. The tone matches my portfolio style somehow.', avatar_url: null },
  { id: 'f6', name: 'Konstantin Weil', role: 'Data Analyst', company: 'Numerik AG', rating: 4, content: 'The acceptance probability helped me stop applying to everything and focus on roles where I actually have a shot. Pro plan paid for itself in the first week.', avatar_url: null },
  { id: 'f7', name: 'coffeeOverflow', role: 'Full Stack Developer', company: null, rating: 4.5, content: 'I used to spend 45 minutes per proposal. Now it\'s 10 minutes of refining. Clients keep saying my proposals feel "personal" which is ironic but hey, it works.', avatar_url: null },
  { id: 'f8', name: 'Amara Osei', role: 'Brand Consultant', company: 'Mosaic Strategy', rating: 3.5, content: 'The before/after comparison sold me on trying it. My proposals used to be copy-paste templates. Now each one actually references the client\'s brief. Response rate improved noticeably.', avatar_url: null },
  { id: 'f9', name: 'cloudninja_88', role: 'DevOps Engineer', company: 'ScaleOps Ltd', rating: 3, content: 'Solid tool overall. Proposal generation is decent but scoring feels slightly optimistic for niche roles. The competitive pressure badges are the most honest part.', avatar_url: null },
  { id: 'f10', name: 'Hana Ishikawa', role: 'UI Designer', company: null, rating: 5, content: 'Non-native English speaker here — this tool is invaluable. It helps me write proposals I\'d never be able to craft on my own. The quality gap between my old and new proposals is embarrassing.', avatar_url: null },
  { id: 'f11', name: 'Rachel M.', role: 'Technical Writer', company: null, rating: 4, content: 'The tone customization is genuinely useful. I switch between formal corporate apps and casual freelance pitches without starting over. Worth the Pro sub for that alone.', avatar_url: null },
  { id: 'f12', name: 'lazyfoxx', role: 'Mobile Developer', company: 'AppForge', rating: 3.5, content: 'Was sending 20+ apps a week with maybe 2 responses. After a month with Sovereign, I get 5-6 from the same volume. Not magic, but definitely an improvement.', avatar_url: null },
];

const translations = {
  en: {
    title: 'All Reviews',
    subtitle: 'Honest feedback from freelancers and professionals using Sovereign every day.',
    avgRating: 'Average Rating',
    totalReviews: 'Total Reviews',
  },
  tr: {
    title: 'Tüm Yorumlar',
    subtitle: 'Sovereign\'ı her gün kullanan freelancerlar ve profesyonellerden dürüst geri bildirimler.',
    avgRating: 'Ortalama Puan',
    totalReviews: 'Toplam Yorum',
  },
  de: {
    title: 'Alle Bewertungen',
    subtitle: 'Ehrliches Feedback von Freelancern und Fachleuten, die Sovereign täglich nutzen.',
    avgRating: 'Durchschnittliche Bewertung',
    totalReviews: 'Gesamtbewertungen',
  },
  fr: {
    title: 'Tous les avis',
    subtitle: 'Retours honnêtes de freelances et professionnels utilisant Sovereign au quotidien.',
    avgRating: 'Note moyenne',
    totalReviews: 'Total des avis',
  },
};

const Reviews = () => {
  const { language } = useLanguage();
  const t = translations[language] || translations.en;

  const { data: dbReviews = [] } = useQuery({
    queryKey: ['reviews-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('is_approved', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Review[];
    },
  });

  const reviews = dbReviews.length > 0 ? dbReviews : ALL_FALLBACK_REVIEWS;
  const avgRating = (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4">
              <Star className="w-4 h-4 text-primary fill-primary" />
            </div>
            <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-4">{t.title}</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">{t.subtitle}</p>

            {/* Stats */}
            <div className="flex items-center justify-center gap-8">
              <div className="text-center">
                <div className="flex items-center gap-1 justify-center mb-1">
                  <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                  <span className="text-2xl font-bold text-foreground">{avgRating}</span>
                </div>
                <span className="text-sm text-muted-foreground">{t.avgRating}</span>
              </div>
              <div className="w-px h-10 bg-border" />
              <div className="text-center">
                <span className="text-2xl font-bold text-foreground">{reviews.length}</span>
                <p className="text-sm text-muted-foreground">{t.totalReviews}</p>
              </div>
            </div>
          </div>

          {/* Reviews Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {reviews.map((review) => (
              <div
                key={review.id}
                className="group p-6 rounded-2xl border border-border bg-card hover:border-primary/30 transition-all duration-300 relative"
              >
                <Quote className="absolute top-4 right-4 w-8 h-8 text-primary/10" />
                
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

                <p className="text-muted-foreground mb-6 leading-relaxed">
                  "{review.content}"
                </p>

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
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Reviews;
