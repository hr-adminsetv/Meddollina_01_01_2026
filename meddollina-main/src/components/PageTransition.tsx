/**
 * =============================================================================
 * PAGE TRANSITION COMPONENT
 * =============================================================================
 * 
 * Provides smooth fade and scale animations when navigating between pages.
 * Wraps page content and animates it in/out on route changes.
 * 
 * ANIMATION SEQUENCE:
 * 1. Route changes
 * 2. Content fades out + scales down slightly
 * 3. New content replaces old content
 * 4. Content fades in + scales up to normal
 * 
 * TIMING:
 * - Exit: 150ms delay before swap
 * - Enter: 500ms ease-out animation
 * 
 * WHERE IT'S USED:
 * In App.tsx, wrapping non-chat routes (landing, login, 404)
 * 
 * @file src/components/PageTransition.tsx
 */

/* =============================================================================
   IMPORTS
   ============================================================================= */

/**
 * React Hooks
 * 
 * useEffect: Run animation logic on route change
 * useState: Track visibility and displayed content
 * ReactNode: Type for children prop
 */
import { useEffect, useState, ReactNode } from 'react';

/**
 * useLocation Hook
 * 
 * Access current route information.
 * Used to detect route changes.
 */
import { useLocation } from 'react-router-dom';

/**
 * cn Utility
 * 
 * Conditional class name merging
 */
import { cn } from '@/lib/utils';

/* =============================================================================
   TYPE DEFINITIONS
   ============================================================================= */

/**
 * PageTransitionProps Interface
 * 
 * Simple props - just wraps children.
 */
interface PageTransitionProps {
  /**
   * children
   * 
   * The page content to animate.
   * Typically a Route component's element.
   */
  children: ReactNode;
}

/* =============================================================================
   COMPONENT DEFINITION
   ============================================================================= */

/**
 * PageTransition Component
 * 
 * Animates page content in and out on route changes.
 * 
 * @param children - Page content to animate
 */
export function PageTransition({ children }: PageTransitionProps) {
  /**
   * useLocation Hook
   * 
   * Returns location object with:
   * - pathname: Current URL path
   * - We use pathname to detect route changes
   */
  const location = useLocation();
  
  /**
   * isVisible State
   * 
   * Controls animation state:
   * - false: Content hidden (faded out, scaled down)
   * - true: Content visible (faded in, normal scale)
   * 
   * INITIAL: false
   * Content starts hidden, then animates in.
   */
  const [isVisible, setIsVisible] = useState(false);
  
  /**
   * displayChildren State
   * 
   * The actual content being rendered.
   * 
   * WHY SEPARATE FROM children PROP?
   * - We need to show OLD content during exit animation
   * - Then swap to NEW content before enter animation
   * - displayChildren holds what's currently shown
   */
  const [displayChildren, setDisplayChildren] = useState(children);

  /**
   * Animation Effect
   * 
   * TRIGGERED BY:
   * - location.pathname change (new route)
   * - children change (new page component)
   * 
   * SEQUENCE:
   * 1. Immediately hide content (triggers exit animation)
   * 2. Wait 150ms for exit animation
   * 3. Swap content to new page
   * 4. Show content (triggers enter animation)
   */
  useEffect(() => {
    /**
     * Step 1: Hide Content
     * 
     * Setting false triggers the exit animation.
     * Content fades out and scales down.
     */
    setIsVisible(false);
    
    /**
     * Step 2 & 3: Wait Then Swap
     * 
     * After 150ms (enough for exit), swap content.
     * Then show (triggers enter animation).
     * 
     * WHY 150ms?
     * - Long enough to see exit animation start
     * - Short enough to feel snappy
     * - Full enter animation is 500ms
     */
    const timer = setTimeout(() => {
      // Swap to new content
      setDisplayChildren(children);
      // Trigger enter animation
      setIsVisible(true);
    }, 150);

    /**
     * Cleanup
     * 
     * Cancel timer if route changes again before timeout.
     * Prevents state updates on stale transitions.
     */
    return () => clearTimeout(timer);
  }, [location.pathname, children]);

  /**
   * Render
   * 
   * Wrapper div with animated classes.
   * displayChildren is what's actually shown.
   */
  return (
    <div
      className={cn(
        /**
         * Base Styles
         * 
         * transition-all: Animate all animatable properties
         * duration-500: 500ms animation time
         * ease-out: Deceleration curve (fast start, slow end)
         */
        'transition-all duration-500 ease-out',
        
        /**
         * Conditional Styles
         * 
         * isVisible TRUE (enter animation):
         * - opacity-100: Fully visible
         * - translate-y-0: Normal position
         * - scale-100: Normal size
         * 
         * isVisible FALSE (exit animation):
         * - opacity-0: Invisible
         * - translate-y-4: Shifted down 1rem
         * - scale-[0.98]: Slightly smaller (98%)
         */
        isVisible 
          ? 'opacity-100 translate-y-0 scale-100' 
          : 'opacity-0 translate-y-4 scale-[0.98]'
      )}
    >
      {displayChildren}
    </div>
  );
}

/* =============================================================================
   ANIMATION BREAKDOWN
   ============================================================================= */

/**
 * VISUAL TIMELINE:
 * 
 * Route Change Triggered
 * │
 * ▼ isVisible = false
 * ┌─────────────────────────────────────────┐
 * │ OLD CONTENT                             │
 * │ opacity: 1 → 0                          │
 * │ translateY: 0 → 4px                     │
 * │ scale: 1 → 0.98                         │
 * └─────────────────────────────────────────┘
 * │
 * │ 150ms delay
 * │
 * ▼ displayChildren = new children
 * ▼ isVisible = true
 * ┌─────────────────────────────────────────┐
 * │ NEW CONTENT                             │
 * │ opacity: 0 → 1                          │
 * │ translateY: 4px → 0                     │
 * │ scale: 0.98 → 1                         │
 * └─────────────────────────────────────────┘
 * │
 * │ 500ms animation
 * │
 * ▼ Animation Complete
 * 
 * 
 * WHAT HAPPENS IF YOU CHANGE VALUES:
 * 
 * duration-500 → duration-1000:
 * - Slower, more dramatic animation
 * - May feel sluggish
 * 
 * delay 150ms → 300ms:
 * - Longer pause between pages
 * - More noticeable transition
 * 
 * scale-[0.98] → scale-[0.95]:
 * - More dramatic shrink effect
 * - More "zoom out/in" feel
 * 
 * translate-y-4 → translate-y-8:
 * - Larger vertical movement
 * - More noticeable slide effect
 */
