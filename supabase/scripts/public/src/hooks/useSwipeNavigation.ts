import { useState, useEffect, useCallback, TouchEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

interface SwipeConfig {
  routes: string[];
  threshold?: number;
  enabled?: boolean;
}

export const useSwipeNavigation = ({ 
  routes, 
  threshold = 80,
  enabled = true 
}: SwipeConfig) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [isSwiping, setIsSwiping] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);

  const currentIndex = routes.indexOf(location.pathname);

  const triggerHaptic = useCallback(() => {
    if ('vibrate' in navigator) {
      navigator.vibrate(15);
    }
  }, []);

  const onTouchStart = useCallback((e: TouchEvent) => {
    if (!enabled) return;
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
    setIsSwiping(false);
    setSwipeDirection(null);
  }, [enabled]);

  const onTouchMove = useCallback((e: TouchEvent) => {
    if (!enabled || touchStart === null) return;
    
    const currentTouch = e.targetTouches[0].clientX;
    setTouchEnd(currentTouch);
    
    const distance = touchStart - currentTouch;
    
    if (Math.abs(distance) > 30) {
      setIsSwiping(true);
      setSwipeDirection(distance > 0 ? 'left' : 'right');
    }
  }, [enabled, touchStart]);

  const onTouchEnd = useCallback(() => {
    if (!enabled || !touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > threshold;
    const isRightSwipe = distance < -threshold;

    if (isLeftSwipe && currentIndex < routes.length - 1) {
      triggerHaptic();
      navigate(routes[currentIndex + 1]);
    } else if (isRightSwipe && currentIndex > 0) {
      triggerHaptic();
      navigate(routes[currentIndex - 1]);
    }

    setTouchStart(null);
    setTouchEnd(null);
    setIsSwiping(false);
    setSwipeDirection(null);
  }, [enabled, touchStart, touchEnd, threshold, currentIndex, routes, navigate, triggerHaptic]);

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    isSwiping,
    swipeDirection,
    currentIndex,
    totalPages: routes.length,
  };
};
