/**
 * =============================================================================
 * ANIMATED CARD COMPONENT
 * =============================================================================
 * 
 * A wrapper component that adds scroll-triggered animations to its children.
 * Uses the IntersectionObserver hook to detect when the card enters the viewport.
 * 
 * ANIMATION BEHAVIOR:
 * 1. Card starts invisible and shifted down (opacity-0, translate-y-8)
 * 2. When card scrolls into view, animate-slide-up triggers
 * 3. Card fades in and slides up to final position
 * 
 * USE CASE:
 * Perfect for staggered animations on landing pages, card grids,
 * or any content that should animate in as user scrolls.
 * 
 * USAGE:
 * <AnimatedCard delay={100}>
 *   <div className="card">Card content</div>
 * </AnimatedCard>
 * 
 * @file src/components/AnimatedCard.tsx
 */

/* =============================================================================
   IMPORTS
   ============================================================================= */

/**
 * Custom hook for viewport detection
 */
import { useIntersectionObserver } from '@/hooks/use-intersection-observer';

/**
 * Utility function for conditional class names
 */
import { cn } from '@/lib/utils';

/**
 * React imports
 * - ReactNode: Type for children prop
 * - forwardRef: HOC to forward refs to DOM elements
 * - HTMLAttributes: Type for standard HTML div attributes
 */
import { ReactNode, forwardRef, HTMLAttributes } from 'react';

/* =============================================================================
   TYPE DEFINITIONS
   ============================================================================= */

/**
 * AnimatedCardProps Interface
 * 
 * Defines the props accepted by AnimatedCard component.
 */
interface AnimatedCardProps {
  /**
   * children
   * 
   * The content to render inside the animated wrapper.
   * Can be any valid React content.
   */
  children: ReactNode;
  
  /**
   * className
   * 
   * Additional CSS classes to apply to the wrapper div.
   * Merged with internal classes using cn() utility.
   * 
   * OPTIONAL - defaults to undefined
   */
  className?: string;
  
  /**
   * delay
   * 
   * Animation delay in milliseconds.
   * Useful for staggering animations in a list.
   * 
   * EXAMPLE: Cards in a grid with delays 0, 100, 200, 300...
   * Creates a wave effect as cards animate in sequence.
   * 
   * DEFAULT: 0 (no delay)
   */
  delay?: number;
}

/* =============================================================================
   COMPONENT DEFINITION
   ============================================================================= */

/**
 * AnimatedCard Component
 * 
 * Wraps children in a div that animates when scrolled into view.
 * Uses forwardRef to properly handle refs passed from parent components.
 * 
 * @param children - Content to animate
 * @param className - Additional CSS classes
 * @param delay - Animation delay in ms
 */
export const AnimatedCard = forwardRef<HTMLDivElement, AnimatedCardProps>(
  ({ children, className, delay = 0 }, forwardedRef) => {
    /**
     * Intersection Observer Hook
     * 
     * ref: Attached to the wrapper div
     * isInView: true when 20% of element is visible
     * 
     * threshold: 0.2 means animation triggers when
     * 20% of the card is visible in viewport.
     * 
     * WHAT HAPPENS IF YOU CHANGE THRESHOLD?
     * - Lower (0.1): Animates sooner (less visible)
     * - Higher (0.5): Animates later (more visible)
     */
    const { ref: observerRef, isInView } = useIntersectionObserver({ threshold: 0.2 });

    /**
     * Render
     * 
     * The wrapper div:
     * - Has ref for intersection observation
     * - Starts with opacity-0 translate-y-8 (invisible, shifted down)
     * - When isInView: adds animate-slide-up class
     * - animationDelay: Controls stagger timing
     */
    return (
      <div
        ref={(node) => {
          // Handle both the observer ref and the forwarded ref
          observerRef.current = node;
          if (typeof forwardedRef === 'function') {
            forwardedRef(node);
          } else if (forwardedRef) {
            forwardedRef.current = node;
          }
        }}
        /**
         * cn() Utility
         * 
         * Conditionally combines class names.
         * 
         * ALWAYS APPLIED:
         * - 'opacity-0 translate-y-8': Initial hidden state
         * 
         * CONDITIONALLY APPLIED:
         * - 'animate-slide-up': Only when isInView is true
         * 
         * PASSED IN:
         * - className: Additional classes from parent
         */
        className={cn(
          'opacity-0 translate-y-8',        // Initial state (hidden, shifted)
          isInView && 'animate-slide-up',   // Animation class when visible
          className                          // Additional classes from props
        )}
        /**
         * Animation Delay
         * 
         * Uses inline style for dynamic delay value.
         * CSS animation-delay can't be set via Tailwind dynamically.
         * 
         * UNIT: milliseconds (ms)
         * - 0: Immediate animation
         * - 100: 0.1 second delay
         * - 500: 0.5 second delay
         */
        style={{ animationDelay: `${delay}ms` }}
      >
        {children}
      </div>
    );
  }
);

// Display name for React DevTools debugging
AnimatedCard.displayName = 'AnimatedCard';

/* =============================================================================
   USAGE EXAMPLES
   ============================================================================= */

/**
 * EXAMPLE 1: Simple usage
 * 
 * <AnimatedCard>
 *   <div className="p-6 bg-card rounded-lg">
 *     <h3>Card Title</h3>
 *     <p>Card content...</p>
 *   </div>
 * </AnimatedCard>
 * 
 * 
 * EXAMPLE 2: Staggered grid
 * 
 * {items.map((item, index) => (
 *   <AnimatedCard key={item.id} delay={index * 100}>
 *     <ItemCard item={item} />
 *   </AnimatedCard>
 * ))}
 * 
 * This creates a wave effect:
 * - First card: 0ms delay
 * - Second card: 100ms delay
 * - Third card: 200ms delay
 * - etc.
 * 
 * 
 * EXAMPLE 3: With custom className
 * 
 * <AnimatedCard className="hover:scale-105 transition-transform">
 *   <ProductCard product={product} />
 * </AnimatedCard>
 */
