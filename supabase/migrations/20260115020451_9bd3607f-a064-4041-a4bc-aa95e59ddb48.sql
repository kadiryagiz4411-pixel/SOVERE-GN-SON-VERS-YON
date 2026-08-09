-- Create reviews table for user testimonials
CREATE TABLE public.reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  role TEXT,
  company TEXT,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  content TEXT NOT NULL,
  avatar_url TEXT,
  is_approved BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Everyone can read approved reviews
CREATE POLICY "Anyone can view approved reviews"
  ON public.reviews FOR SELECT
  USING (is_approved = true);

-- Authenticated users can create reviews
CREATE POLICY "Authenticated users can create reviews"
  ON public.reviews FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own reviews
CREATE POLICY "Users can update their own reviews"
  ON public.reviews FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can delete their own reviews
CREATE POLICY "Users can delete their own reviews"
  ON public.reviews FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins can manage all reviews
CREATE POLICY "Admins can manage all reviews"
  ON public.reviews FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Add trigger for updated_at
CREATE TRIGGER update_reviews_updated_at
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some sample approved reviews
INSERT INTO public.reviews (name, role, company, rating, content, is_approved) VALUES
  ('Ahmet Yılmaz', 'Freelance Developer', 'Bağımsız', 5, 'Sovereign sayesinde iş başvurularımda kabul oranım %40 arttı. Artık hangi şirketlere başvurmam gerektiğini biliyorum.', true),
  ('Sarah Johnson', 'UX Designer', 'DesignCo', 5, 'Game changer! I used to spend hours on each application. Now I get acceptance probability scores and know exactly where to focus.', true),
  ('Mehmet Kaya', 'Full Stack Developer', 'TechStart', 4, 'Şirkete özel optimizasyon özelliği muhteşem. Her başvuru artık hedefe yönelik.', true),
  ('Emily Chen', 'Product Manager', 'StartupXYZ', 5, 'The strategic insights helped me understand why my applications were failing. Now I have a 3x higher response rate!', true),
  ('Zeynep Demir', 'Mobile Developer', 'AppWorks', 5, 'Elite plan ile gelen strateji özellikleri harika. LinkedIn mesajları bile hazır geliyor.', true);