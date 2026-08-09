import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Star, Send, Loader2, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/i18n/LanguageContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const reviewSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  role: z.string().max(100).optional(),
  company: z.string().max(100).optional(),
  rating: z.number().min(1).max(5),
  content: z.string().min(10, 'Review must be at least 10 characters').max(1000),
});

type ReviewFormData = z.infer<typeof reviewSchema>;

interface ExistingReview {
  id: string;
  name: string;
  role: string | null;
  company: string | null;
  rating: number;
  content: string;
  is_approved: boolean;
}

interface ReviewFormProps {
  userId: string;
  userName?: string | null;
}

export const ReviewForm = ({ userId, userName }: ReviewFormProps) => {
  const { t } = useLanguage();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingReview, setExistingReview] = useState<ExistingReview | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [hoveredStar, setHoveredStar] = useState(0);

  const form = useForm<ReviewFormData>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      name: userName || '',
      role: '',
      company: '',
      rating: 5,
      content: '',
    },
  });

  // Check for existing review
  useEffect(() => {
    const fetchExistingReview = async () => {
      const { data } = await supabase
        .from('reviews')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (data) {
        setExistingReview(data);
        form.reset({
          name: data.name,
          role: data.role || '',
          company: data.company || '',
          rating: data.rating,
          content: data.content,
        });
      }
    };

    fetchExistingReview();
  }, [userId, form]);

  const onSubmit = async (data: ReviewFormData) => {
    setIsSubmitting(true);

    try {
      if (existingReview) {
        // Update existing review
        const { error } = await supabase
          .from('reviews')
          .update({
            name: data.name,
            role: data.role || null,
            company: data.company || null,
            rating: data.rating,
            content: data.content,
            is_approved: false, // Reset approval when updated
          })
          .eq('id', existingReview.id);

        if (error) throw error;
        
        setExistingReview({
          ...existingReview,
          ...data,
          is_approved: false,
        });
        
        toast.success(t.reviewForm?.updated || 'Review updated successfully!');
      } else {
        // Create new review
        const { data: newReview, error } = await supabase
          .from('reviews')
          .insert({
            user_id: userId,
            name: data.name,
            role: data.role || null,
            company: data.company || null,
            rating: data.rating,
            content: data.content,
            is_approved: false,
          })
          .select()
          .single();

        if (error) throw error;
        
        setExistingReview(newReview);
        toast.success(t.reviewForm?.success || 'Review submitted successfully!');
      }
      
      setIsExpanded(false);
    } catch (error: any) {
      console.error('Review submission error:', error);
      toast.error(t.reviewForm?.error || 'Failed to submit review');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentRating = form.watch('rating');

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header - Always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-amber-500/20 flex items-center justify-center">
            <Star className="w-5 h-5 text-primary" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-foreground">
              {t.reviewForm?.title || 'Share Your Experience'}
            </h3>
            {existingReview && !existingReview.is_approved && (
              <p className="text-xs text-amber-500 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {t.reviewForm?.pending || 'Your review is pending approval'}
              </p>
            )}
            {existingReview && existingReview.is_approved && (
              <p className="text-xs text-green-500">
                {t.reviewForm?.approved || 'Your review is live!'}
              </p>
            )}
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        )}
      </button>

      {/* Form - Collapsible */}
      {isExpanded && (
        <div className="p-4 pt-0 border-t border-border">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Star Rating */}
              <FormField
                control={form.control}
                name="rating"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.reviewForm?.rating || 'Rating'}</FormLabel>
                    <FormControl>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => field.onChange(star)}
                            onMouseEnter={() => setHoveredStar(star)}
                            onMouseLeave={() => setHoveredStar(0)}
                            className="p-1 transition-transform hover:scale-110"
                          >
                            <Star
                              className={cn(
                                'w-6 h-6 transition-colors',
                                (hoveredStar || currentRating) >= star
                                  ? 'fill-amber-400 text-amber-400'
                                  : 'text-muted-foreground'
                              )}
                            />
                          </button>
                        ))}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.reviewForm?.name || 'Your Name'}</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Role & Company */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.reviewForm?.role || 'Your Role'}</FormLabel>
                      <FormControl>
                        <Input placeholder="Freelancer" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="company"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.reviewForm?.company || 'Company'}</FormLabel>
                      <FormControl>
                        <Input placeholder="Acme Inc." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Content */}
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.reviewForm?.content || 'Your Review'}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t.reviewForm?.contentPlaceholder || 'Share your experience with Sovereign...'}
                        className="min-h-[100px] resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Submit */}
              <Button
                type="submit"
                variant="gold"
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t.common?.loading || 'Loading...'}
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    {existingReview 
                      ? (t.reviewForm?.update || 'Update Review')
                      : (t.reviewForm?.submit || 'Submit Review')
                    }
                  </>
                )}
              </Button>
            </form>
          </Form>
        </div>
      )}
    </div>
  );
};
