/**
 * =============================================================================
 * USE MOBILE HOOK
 * =============================================================================
 * 
 * Custom React hook that detects if the current viewport is mobile-sized.
 * Uses the browser's matchMedia API for efficient, event-driven detection.
 * 
 * WHY THIS HOOK?
 * - Responsive behavior in JavaScript (not just CSS)
 * - Conditionally render different components for mobile/desktop
 * - Trigger different logic based on screen size
 * 
 * HOW IT WORKS:
 * 1. Creates a media query listener for mobile breakpoint
 * 2. Updates state when viewport crosses the breakpoint
 * 3. Cleans up listener on unmount
 * 
 * USAGE:
 * function MyComponent() {
 *   const isMobile = useIsMobile();
 *   return isMobile ? <MobileView /> : <DesktopView />;
 * }
 * 
 * @file src/hooks/use-mobile.tsx
 */

/* =============================================================================
   IMPORTS
   ============================================================================= */

import * as React from "react";

/* =============================================================================
   CONSTANTS
   ============================================================================= */

/**
 * MOBILE_BREAKPOINT
 * 
 * The pixel width threshold for mobile detection.
 * Viewport widths < 768px are considered mobile.
 * 
 * WHY 768px?
 * - Standard tablet portrait width
 * - Matches Tailwind's 'md' breakpoint
 * - Common industry standard
 * 
 * WHAT HAPPENS IF YOU CHANGE IT?
 * - 640: More aggressive mobile detection (small tablets = mobile)
 * - 1024: More lenient (tablets = desktop)
 */
const MOBILE_BREAKPOINT = 768;

/* =============================================================================
   HOOK DEFINITION
   ============================================================================= */

/**
 * useIsMobile Hook
 * 
 * Detects whether the current viewport is mobile-sized.
 * 
 * @returns boolean - true if viewport < MOBILE_BREAKPOINT, false otherwise
 * 
 * STATE FLOW:
 * 1. Initial: undefined (SSR-safe, unknown state)
 * 2. After mount: true or false based on window width
 * 3. On resize: Updates when crossing breakpoint
 */
export function useIsMobile() {
  /**
   * isMobile State
   * 
   * TYPE: boolean | undefined
   * - undefined: Initial state, not yet measured
   * - true: Mobile viewport
   * - false: Desktop viewport
   * 
   * WHY UNDEFINED INITIAL?
   * - SSR safety: No window object during server render
   * - Prevents hydration mismatch
   * - Component can handle loading state if needed
   */
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

  /**
   * Effect: Setup Media Query Listener
   * 
   * DEPENDENCY: [] (empty array)
   * - Runs once on mount
   * - Cleanup runs on unmount
   * 
   * matchMedia API:
   * - More efficient than resize event listener
   * - Only fires when crossing the breakpoint
   * - Doesn't fire on every pixel change
   */
  React.useEffect(() => {
    /**
     * Create Media Query List
     * 
     * Template: `(max-width: ${MOBILE_BREAKPOINT - 1}px)`
     * Result: "(max-width: 767px)"
     * 
     * WHY -1?
     * - max-width: 767px = widths 0-767 (768 not included)
     * - At exactly 768px, we want desktop behavior
     */
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    
    /**
     * onChange Handler
     * 
     * Called when viewport crosses the breakpoint.
     * Uses window.innerWidth for the actual check.
     */
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    
    /**
     * Add Event Listener
     * 
     * "change" event fires when media query match state changes.
     * Only triggers when crossing the breakpoint threshold.
     */
    mql.addEventListener("change", onChange);
    
    /**
     * Initial Measurement
     * 
     * Set initial value based on current window width.
     * Must do this because "change" event hasn't fired yet.
     */
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    
    /**
     * Cleanup Function
     * 
     * Removes event listener when:
     * - Component unmounts
     * - Prevents memory leaks
     * - Prevents state updates on unmounted component
     */
    return () => mql.removeEventListener("change", onChange);
  }, []);

  /**
   * Return Value
   * 
   * !!isMobile converts to definite boolean:
   * - undefined → false
   * - true → true
   * - false → false
   * 
   * This ensures return type is always boolean, not boolean | undefined
   * 
   * NOTE: On first render, this returns false (from !!undefined)
   * If you need to handle loading state, check for undefined directly:
   * 
   * const isMobile = useIsMobile();
   * if (isMobile === undefined) return <Loading />;
   */
  return !!isMobile;
}
