/**
 * =============================================================================
 * AI THINKING ANIMATION COMPONENT
 * =============================================================================
 * 
 * This component displays an animated loading indicator while the AI is
 * generating a response. It creates an engaging, medical-themed visualization
 * that keeps users informed that the system is working.
 * 
 * ANIMATION PHASES:
 * 1. LOGO: Shows the SETV logo
 * 2. MORPH-TO-SPHERE: Logo transforms into animated orb
 * 3. SPHERE: 3D gyroscope with orbital rings
 * 4. MORPH-TO-LOGO: Orb transforms back to logo
 * (Repeats in a cycle)
 * 
 * VISUAL COMPONENTS:
 * ┌─────────────────────────────────────────────────┐
 * │  ┌─────────┐                                    │
 * │  │  🔮/📱  │  "Accessing clinical database"    │
 * │  │  (orb/  │  (rotating status messages)       │
 * │  │  logo)  │                                    │
 * │  └─────────┘                                    │
 * └─────────────────────────────────────────────────┘
 * 
 * TECHNICAL FEATURES:
 * - CSS 3D transforms for depth effect
 * - Multiple animated orbital rings
 * - Floating particles
 * - Smooth morphing transitions
 * - Rotating text status messages
 * 
 * @file src/components/chat/AIThinkingAnimation.tsx
 * @module AIThinkingAnimation
 */

/* =============================================================================
   IMPORTS
   ============================================================================= */

import { useState, useEffect, useRef } from 'react';

/**
 * Cross Icon from Lucide
 * 
 * Used as the medical symbol in the center of the gyroscope.
 * Represents the medical/healthcare context of the app.
 */
import { Cross } from 'lucide-react';

/**
 * SETV Logo
 * 
 * Brand logo shown during the "logo" phase of the animation.
 */
import setvLogo from '@/assets/setv-logo.png';

/* =============================================================================
   CONSTANTS
   ============================================================================= */

/**
 * LOADING_STAGES
 * 
 * Array of status messages displayed sequentially during loading.
 * Each message describes a "step" in the AI processing.
 * 
 * PURPOSE:
 * - Keeps users engaged during wait
 * - Provides illusion of progress
 * - Communicates that work is happening
 * 
 * WHAT HAPPENS IF YOU ADD MORE?
 * - More variety in messages shown
 * - Each message shown for same duration
 * - Cycles back to start after last message
 * 
 * WHAT HAPPENS IF YOU CHANGE THE TEXT?
 * - Different messages displayed
 * - Should match your app's context
 */
const LOADING_STAGES = [
  "Accessing clinical database",       // Initial data retrieval
  "Parsing differentials needed",      // Analyzing requirements
  "Creating a case sheet",             // Generating structure
  "Reviewing medical codings",         // Checking classifications
  "Synthesizing evidence based protocols", // Applying best practices
  "Validating deeper",                 // Double-checking
  "Correlating and cross referencing", // Final verification
];

/**
 * TIMING Configuration Object
 * 
 * Centralized timing constants for all animations.
 * Organized in one place for easy tuning.
 * 
 * TIMING FLOW:
 * |--INITIAL_DELAY--|--MORPH_TO_SPHERE--|--SPHERE_DURATION--|--MORPH_TO_LOGO--|
 * |      600ms      |       500ms       |       2300ms      |       500ms     |
 * |                 |<------------------ CYCLE_INTERVAL (4000ms) ------------->|
 * 
 * WHAT HAPPENS IF YOU CHANGE THESE?
 * 
 * MORPH_TO_SPHERE (500ms):
 * - Increase: Slower logo-to-sphere transition
 * - Decrease: Snappier transformation
 * 
 * SPHERE_DURATION (2800ms):
 * - Increase: Sphere visible longer
 * - Decrease: Less time to appreciate the animation
 * 
 * CYCLE_INTERVAL (4000ms):
 * - Must be > MORPH_TO_LOGO to complete cycle
 * - Increase: Slower overall animation
 * - Decrease: Faster cycling
 * 
 * TEXT_INTERVAL (1800ms):
 * - Time each status message is shown
 * - Increase: More time to read each message
 * - Decrease: Faster text cycling
 */
const TIMING = {
  /** Delay before first morph (logo visible time at start) */
  MORPH_TO_SPHERE: 500,
  
  /** When to start morphing back (from cycle start) */
  SPHERE_DURATION: 2800,
  
  /** When to complete morph back to logo (from cycle start) */
  MORPH_TO_LOGO: 3300,
  
  /** Complete cycle duration (must be > MORPH_TO_LOGO) */
  CYCLE_INTERVAL: 4000,
  
  /** Delay before starting animation cycle */
  INITIAL_DELAY: 600,
  
  /** Duration of text fade transition */
  TEXT_TRANSITION: 350,
  
  /** Time between text changes */
  TEXT_INTERVAL: 1800,
};

/* =============================================================================
   COMPONENT
   ============================================================================= */

/**
 * AIThinkingAnimation Component
 * 
 * Renders an animated loading indicator with:
 * - Morphing logo/gyroscope visualization
 * - 3D orbital rings
 * - Floating particles
 * - Rotating status text
 * 
 * NO PROPS:
 * - Self-contained animation
 * - Manages its own state
 * - Simply renders when placed in DOM
 */
export function AIThinkingAnimation() {
  
  /* ---------------------------------------------------------------------------
     STATE DECLARATIONS
     --------------------------------------------------------------------------- */
  
  /**
   * phase State
   * 
   * Current phase of the morph animation cycle.
   * 
   * PHASES:
   * - 'logo': Showing static logo
   * - 'morph-to-sphere': Transitioning to orb
   * - 'sphere': Showing animated orb
   * - 'morph-to-logo': Transitioning back to logo
   * 
   * FLOW:
   * logo → morph-to-sphere → sphere → morph-to-logo → logo → ...
   */
  const [phase, setPhase] = useState<'logo' | 'morph-to-sphere' | 'sphere' | 'morph-to-logo'>('logo');
  
  /**
   * currentStage State
   * 
   * Index of current loading message in LOADING_STAGES array.
   * 
   * RANGE: 0 to LOADING_STAGES.length - 1
   * CYCLES: Wraps back to 0 after reaching end
   */
  const [currentStage, setCurrentStage] = useState(0);
  
  /**
   * isTextAnimating State
   * 
   * Controls text transition animation.
   * 
   * ANIMATION FLOW:
   * 1. isTextAnimating = true (text slides up and fades)
   * 2. currentStage incremented
   * 3. isTextAnimating = false (new text slides in)
   */
  const [isTextAnimating, setIsTextAnimating] = useState(false);

  /* ---------------------------------------------------------------------------
     REFS
     --------------------------------------------------------------------------- */
  
  /**
   * timeoutsRef
   * 
   * Stores timeout IDs for cleanup.
   * 
   * WHY REF?
   * - Need to clear timeouts on unmount
   * - Don't want to trigger re-renders when storing IDs
   * - Mutable storage that persists across renders
   * 
   * MEMORY LEAK PREVENTION:
   * - Timeouts continue even if component unmounts
   * - Clearing them prevents state updates on unmounted component
   * - Avoids "Can't perform state update on unmounted component" warning
   */
  const timeoutsRef = useRef<number[]>([]);

  /* ---------------------------------------------------------------------------
     EFFECTS
     --------------------------------------------------------------------------- */

  /**
   * Phase Cycle Effect
   * 
   * Manages the logo-to-sphere-to-logo animation cycle.
   * 
   * EMPTY DEPENDENCY []:
   * - Runs once on mount
   * - Sets up interval that runs throughout component lifetime
   * - Cleanup runs on unmount
   * 
   * CYCLE TIMING:
   * 0ms:    Start morph-to-sphere
   * 500ms:  Enter sphere phase
   * 2800ms: Start morph-to-logo
   * 3300ms: Enter logo phase
   * 4000ms: Cycle repeats
   */
  useEffect(() => {
    /**
     * clearAll Function
     * 
     * Clears all stored timeouts.
     * Called before setting new ones and on cleanup.
     */
    const clearAll = () => {
      timeoutsRef.current.forEach(t => window.clearTimeout(t));
      timeoutsRef.current = [];
    };

    /**
     * cycle Function
     * 
     * Runs one complete animation cycle.
     * Called initially after delay, then every CYCLE_INTERVAL.
     */
    const cycle = () => {
      // Clear any pending timeouts from previous cycle
      clearAll();
      
      // Start the morph to sphere
      setPhase('morph-to-sphere');
      
      // Schedule subsequent phase changes
      // Using window.setTimeout for explicit browser timer
      timeoutsRef.current.push(
        window.setTimeout(() => setPhase('sphere'), TIMING.MORPH_TO_SPHERE)
      );
      timeoutsRef.current.push(
        window.setTimeout(() => setPhase('morph-to-logo'), TIMING.SPHERE_DURATION)
      );
      timeoutsRef.current.push(
        window.setTimeout(() => setPhase('logo'), TIMING.MORPH_TO_LOGO)
      );
    };

    // Start first cycle after initial delay
    const initial = window.setTimeout(cycle, TIMING.INITIAL_DELAY);
    
    // Set up recurring cycle
    const interval = window.setInterval(cycle, TIMING.CYCLE_INTERVAL);

    // Cleanup function (runs on unmount)
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(interval);
      clearAll();
    };
  }, []);

  /**
   * Text Cycling Effect
   * 
   * Rotates through loading status messages.
   * 
   * ANIMATION:
   * 1. Set isTextAnimating = true (triggers exit animation)
   * 2. Wait TEXT_TRANSITION ms
   * 3. Update currentStage (next message)
   * 4. Set isTextAnimating = false (triggers enter animation)
   * 5. Wait remaining time until next change
   * 
   * isMounted FLAG:
   * - Prevents state updates after unmount
   * - Set to false in cleanup
   * - Checked before any state update
   */
  useEffect(() => {
    let isMounted = true;
    
    const interval = window.setInterval(() => {
      // Guard: Don't update if unmounted
      if (!isMounted) return;
      
      // Start exit animation
      setIsTextAnimating(true);
      
      // After transition, update text and show
      const timeout = window.setTimeout(() => {
        if (!isMounted) return;
        
        // Move to next stage (wrap to 0 at end)
        setCurrentStage(prev => (prev + 1) % LOADING_STAGES.length);
        
        // Start enter animation
        setIsTextAnimating(false);
      }, TIMING.TEXT_TRANSITION);
      
      // Store for cleanup
      timeoutsRef.current.push(timeout);
    }, TIMING.TEXT_INTERVAL);

    // Cleanup
    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, []);

  /* ---------------------------------------------------------------------------
     COMPUTED VALUES
     --------------------------------------------------------------------------- */

  /**
   * isSpherical
   * 
   * Boolean indicating if orb should be visible.
   * True during 'sphere' and 'morph-to-sphere' phases.
   * 
   * USED FOR:
   * - Showing/hiding gyroscope elements
   * - Hiding/showing logo
   * - Toggling glow effects
   */
  const isSpherical = phase === 'sphere' || phase === 'morph-to-sphere';

  /* ---------------------------------------------------------------------------
     RENDER
     --------------------------------------------------------------------------- */

  return (
    // Root Container - Uses CSS class for styling. Flexbox for horizontal alignment.
    <div className="ai-thinking-container">
      
      {/* =================================================================
          3D ORB CONTAINER
          ================================================================= */}
      
      {/* 
        Perspective Container
        Creates 3D perspective for child elements.
        perspective: 200px - Distance from viewer to z=0 plane
        Lower = more dramatic 3D effect, Higher = flatter appearance
      */}
      <div className="ai-thinking-orb-container">
        
        {/* -----------------------------------------------------------------
            GLOW EFFECTS
            ----------------------------------------------------------------- */}
        
        {/* 
          Outer Glow - Large, soft glow around the orb.
          Only visible during spherical phases.
          ai-thinking-glow-visible: Shows gradient glow with animation
          opacity-0: Completely hidden
        */}
        <div
          className={`ai-thinking-glow-outer ${isSpherical ? 'ai-thinking-glow-visible' : 'opacity-0'}`}
        />
        
        {/* 
          Inner Glow - Secondary, tighter glow layer.
          Rotates in opposite direction for visual interest.
        */}
        <div
          className={`ai-thinking-glow-inner ${isSpherical ? 'ai-thinking-glow-inner-visible' : 'opacity-0'}`}
        />

        {/* -----------------------------------------------------------------
            LOGO (Visible when not spherical)
            ----------------------------------------------------------------- */}
        
        {/* 
          Logo Container - Shows brand logo during 'logo' phase.
          Animates out (shrink + rotate) when morphing to sphere.
          ai-thinking-logo-visible: Full size, visible, no rotation
          ai-thinking-logo-hidden: Shrunk, invisible, rotated 180°
        */}
        <div
          className={`ai-thinking-logo ${
            isSpherical ? 'ai-thinking-logo-hidden' : 'ai-thinking-logo-visible'
          }`}
        >
          <img src={setvLogo} alt="SETV" className="w-11 h-11 object-cover rounded-xl" />
        </div>

        {/* -----------------------------------------------------------------
            3D GYROSCOPE (Visible when spherical)
            ----------------------------------------------------------------- */}
        
        {/* 
          Gyroscope Container - Contains all the 3D orbital elements.
          transform-style: preserve-3d enables true 3D positioning
          animation: gyro-rotate creates slow rotation of entire gyroscope
        */}
        <div
          className={`ai-thinking-gyroscope ${
            isSpherical ? 'ai-thinking-gyroscope-visible' : 'ai-thinking-gyroscope-hidden'
          }`}
        >
          {/* 
            Central Core - Medical cross icon at the center.
            Gradient background (cyan → purple → pink) with glowing shadow.
          */}
          <div className="ai-thinking-core">
            <Cross className="w-4 h-4 text-white drop-shadow-lg" strokeWidth={3} />
          </div>

          {/* 
            Orbital Rings - 8 rings rotating around the core at different angles.
            Each has different color, rotation axis, animation speed, and direction.
            rotateX/Y/Z combined create 3D positions.
          */}
          <div className="ai-orbit-ring ai-orbit-ring-1" />
          <div className="ai-orbit-ring ai-orbit-ring-2" />
          <div className="ai-orbit-ring ai-orbit-ring-3" />
          <div className="ai-orbit-ring ai-orbit-ring-4" />
          <div className="ai-orbit-ring ai-orbit-ring-5" />
          <div className="ai-orbit-ring ai-orbit-ring-6" />
          <div className="ai-orbit-ring ai-orbit-ring-7" />
          <div className="ai-orbit-ring ai-orbit-ring-8" />

          {/* 
            Particles - Small glowing dots that float around the core.
            particle-float animation creates scale and opacity pulsing.
            translate3D positions each in 3D space (front/behind).
          */}
          <div className="ai-particle ai-particle-1" />
          <div className="ai-particle ai-particle-2" />
          <div className="ai-particle ai-particle-3" />
          <div className="ai-particle ai-particle-4" />
          <div className="ai-particle ai-particle-5" />
          <div className="ai-particle ai-particle-6" />
        </div>
      </div>

      {/* =================================================================
          STATUS TEXT
          ================================================================= */}
      
      {/* 
        Text Container - Fixed height (h-5) for status text.
        overflow-hidden clips the animating text and prevents layout shift.
      */}
      <div className="overflow-hidden h-5">
        {/* 
          Status Text - Current loading stage message.
          ai-thinking-text-enter: Normal position, full opacity
          ai-thinking-text-exit: Shifted up, faded out
        */}
        <span 
          className={`ai-thinking-text ${
            isTextAnimating ? 'ai-thinking-text-exit' : 'ai-thinking-text-enter'
          }`}
        >
          {LOADING_STAGES[currentStage]}
        </span>
      </div>
    </div>
  );
}

/* =============================================================================
   NOTES ON CSS ANIMATIONS (Defined in index.css)
   ============================================================================= */

/**
 * The following keyframe animations are defined in index.css:
 * 
 * @keyframes gyro-rotate
 * - Rotates the entire gyroscope container
 * - Creates the main 3D tumbling effect
 * 
 * @keyframes glow-pulse
 * - Pulses the glow layers
 * - Scale and opacity variation
 * 
 * @keyframes particle-float
 * - Animates the floating particles
 * - Scale and opacity pulsing
 * 
 * @keyframes spin
 * - Standard 360° rotation
 * - Used by individual orbital rings
 * 
 * These are defined in CSS rather than inline because:
 * - CSS animations are more performant
 * - Can be GPU-accelerated
 * - Cleaner separation of concerns
 * - Easier to maintain and modify
 */
