/**
 * =============================================================================
 * INTERSECTION OBSERVER HOOK
 * =============================================================================
 * 
 * Custom React hook that detects when an element enters the viewport.
 * Used for scroll-triggered animations, lazy loading, and analytics.
 * 
 * HOW IT WORKS:
 * 1. Creates an IntersectionObserver that watches an element
 * 2. When element enters/exits viewport, updates isInView state
 * 3. Can optionally stop observing after first intersection
 * 
 * USE CASES:
 * - Fade-in animations when scrolling
 * - Lazy load images/components
 * - Track when user sees content (analytics)
 * - Infinite scroll triggers
 * 
 * USAGE:
 * function AnimatedSection() {
 *   const { ref, isInView } = useIntersectionObserver({ threshold: 0.2 });
 *   return (
 *     <div ref={ref} className={isInView ? 'animate-in' : 'opacity-0'}>
 *       Content
 *     </div>
 *   );
 * }
 * 
 * @file src/hooks/use-intersection-observer.tsx
 */

/* =============================================================================
   IMPORTS
   ============================================================================= */

import { useEffect, useRef, useState } from 'react';

/* =============================================================================
   TYPE DEFINITIONS
   ============================================================================= */

/**
 * UseIntersectionObserverOptions
 * 
 * Configuration options for the hook.
 * All properties are optional with sensible defaults.
 */
interface UseIntersectionObserverOptions {
  /**
   * threshold
   * 
   * Percentage of element that must be visible to trigger.
   * 
   * VALUES:
   * - 0: Triggers as soon as any part is visible
   * - 0.5: Triggers when 50% is visible
   * - 1: Triggers only when fully visible
   * 
   * DEFAULT: 0.1 (10% visible)
   * 
   * CAN BE ARRAY: [0, 0.25, 0.5, 0.75, 1]
   * This would fire callbacks at each threshold.
   */
  threshold?: number;
  
  /**
   * rootMargin
   * 
   * Margin around the root (viewport) for intersection calculation.
   * Uses CSS margin syntax.
   * 
   * EXAMPLES:
   * - "0px": No margin (default)
   * - "100px": Trigger 100px before element enters viewport
   * - "-50px": Trigger 50px after element enters viewport
   * - "100px 0px": Different top/bottom margins
   * 
   * DEFAULT: "0px"
   */
  rootMargin?: string;
  
  /**
   * triggerOnce
   * 
   * Whether to stop observing after first intersection.
   * 
   * TRUE (default): Animation plays once, then stops observing
   * FALSE: Animation can reverse when element leaves viewport
   * 
   * PERFORMANCE: true is better for one-time animations
   */
  triggerOnce?: boolean;
}

/* =============================================================================
   HOOK DEFINITION
   ============================================================================= */

/**
 * useIntersectionObserver Hook
 * 
 * Tracks whether an element is visible in the viewport.
 * 
 * @param options - Configuration options (threshold, rootMargin, triggerOnce)
 * @returns Object with ref (attach to element) and isInView (visibility state)
 */
export const useIntersectionObserver = ({
  threshold = 0.1,
  rootMargin = '0px',
  triggerOnce = true,
}: UseIntersectionObserverOptions = {}) => {
  
  /* -------------------------------------------------------------------------
     STATE AND REFS
     ------------------------------------------------------------------------- */
  
  /**
   * Element Ref
   * 
   * Reference to the DOM element being observed.
   * User attaches this to their element via ref prop.
   * 
   * TYPE: HTMLDivElement - Most common use case
   * Could be made generic: useRef<T extends HTMLElement>
   */
  const ref = useRef<HTMLDivElement>(null);
  
  /**
   * isInView State
   * 
   * Whether the element is currently visible in the viewport.
   * 
   * INITIAL: false
   * - Elements start invisible
   * - Becomes true when threshold is crossed
   */
  const [isInView, setIsInView] = useState(false);

  /* -------------------------------------------------------------------------
     EFFECT: INTERSECTION OBSERVER SETUP
     ------------------------------------------------------------------------- */

  /**
   * Observer Setup Effect
   * 
   * DEPENDENCIES: [threshold, rootMargin, triggerOnce]
   * - Re-runs if any option changes
   * - Creates new observer with updated options
   */
  useEffect(() => {
    /**
     * Get Element Reference
     * 
     * ref.current is the actual DOM element.
     * May be null if element hasn't rendered yet.
     */
    const element = ref.current;
    
    /**
     * Guard: No Element
     * 
     * If ref isn't attached to an element, exit early.
     * Observer can't watch nothing.
     */
    if (!element) return;

    /**
     * Create IntersectionObserver
     * 
     * CALLBACK PARAMETERS:
     * - entries: Array of IntersectionObserverEntry objects
     *   (Usually just one entry since we're observing one element)
     * 
     * entry.isIntersecting:
     * - true: Element crosses INTO the intersection threshold
     * - false: Element crosses OUT OF the intersection threshold
     */
    const observer = new IntersectionObserver(
      ([entry]) => {
        // Check if element is intersecting
        if (entry.isIntersecting) {
          // Element is visible - set state to true
          setIsInView(true);
          
          // If triggerOnce, stop observing after first intersection
          if (triggerOnce) {
            observer.unobserve(element);
          }
        } else if (!triggerOnce) {
          // Element left viewport and we want to track that
          // Reset to false so animation can replay
          setIsInView(false);
        }
      },
      /**
       * Observer Options
       * 
       * threshold: Intersection ratio to trigger callback
       * rootMargin: Margin around viewport
       * root: null = viewport (could be a scrollable container)
       */
      { threshold, rootMargin }
    );

    /**
     * Start Observing
     * 
     * Tells the observer to watch this element.
     * Callback fires when visibility threshold is crossed.
     */
    observer.observe(element);

    /**
     * Cleanup Function
     * 
     * Disconnects observer when:
     * - Component unmounts
     * - Dependencies change (new observer created)
     * 
     * disconnect() stops all observations.
     * Prevents memory leaks.
     */
    return () => observer.disconnect();
  }, [threshold, rootMargin, triggerOnce]);

  /* -------------------------------------------------------------------------
     RETURN VALUE
     ------------------------------------------------------------------------- */

  /**
   * Return Object
   * 
   * ref: Attach to the element you want to observe
   * isInView: Current visibility state
   * 
   * USAGE:
   * const { ref, isInView } = useIntersectionObserver();
   * <div ref={ref}>{isInView && <AnimatedContent />}</div>
   */
  return { ref, isInView };
};
