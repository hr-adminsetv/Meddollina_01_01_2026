/**
 * =============================================================================
 * NAV LINK COMPONENT
 * =============================================================================
 * 
 * A wrapper around React Router's NavLink that provides cleaner styling API.
 * 
 * WHY THIS WRAPPER?
 * React Router's NavLink uses a render function for className:
 *   className={({ isActive }) => isActive ? 'active' : ''}
 * 
 * This wrapper provides a simpler API:
 *   className="base-styles" activeClassName="when-active"
 * 
 * FEATURES:
 * - Simpler prop-based class handling
 * - Supports active and pending states
 * - Fully typed with TypeScript
 * - Uses forwardRef for ref forwarding
 * 
 * @file src/components/NavLink.tsx
 */

/* =============================================================================
   IMPORTS
   ============================================================================= */

/**
 * React Router NavLink
 * 
 * NavLink is like Link but with active state awareness.
 * It knows when the current URL matches its "to" prop.
 * 
 * NavLinkProps: TypeScript types for NavLink props
 */
import { NavLink as RouterNavLink, NavLinkProps } from "react-router-dom";

/**
 * forwardRef
 * 
 * Allows this component to receive a ref from parent
 * and forward it to the underlying anchor element.
 */
import { forwardRef } from "react";

/**
 * cn Utility
 * 
 * Conditionally combines class names.
 * Handles undefined values and conflicts.
 */
import { cn } from "@/lib/utils";

/* =============================================================================
   TYPE DEFINITIONS
   ============================================================================= */

/**
 * NavLinkCompatProps Interface
 * 
 * Custom props that differ from React Router's NavLinkProps.
 * 
 * Omit<NavLinkProps, "className">:
 * - Takes all NavLink props EXCEPT className
 * - We replace className with our simpler version
 */
interface NavLinkCompatProps extends Omit<NavLinkProps, "className"> {
  /**
   * className
   * 
   * Base styles applied regardless of active state.
   * 
   * TYPE: string (simple) instead of function (React Router's default)
   */
  className?: string;
  
  /**
   * activeClassName
   * 
   * Additional styles applied when link is active
   * (current URL matches the "to" prop).
   * 
   * EXAMPLE: "bg-primary text-white"
   */
  activeClassName?: string;
  
  /**
   * pendingClassName
   * 
   * Additional styles applied during navigation
   * (while destination is loading).
   * 
   * USEFUL FOR: Loading indicators on slow navigations
   */
  pendingClassName?: string;
}

/* =============================================================================
   COMPONENT DEFINITION
   ============================================================================= */

/**
 * NavLink Component
 * 
 * Wrapped in forwardRef to allow ref forwarding.
 * 
 * TYPE PARAMETERS:
 * - HTMLAnchorElement: The ref points to an anchor tag
 * - NavLinkCompatProps: Our custom props interface
 * 
 * FUNCTION PARAMETERS:
 * - props: Destructured to extract our custom props
 * - ref: The forwarded ref from parent component
 */
const NavLink = forwardRef<HTMLAnchorElement, NavLinkCompatProps>(
  ({ className, activeClassName, pendingClassName, to, ...props }, ref) => {
    /**
     * Return RouterNavLink
     * 
     * Uses React Router's NavLink under the hood.
     * Converts our simple className props to Router's function pattern.
     */
    return (
      <RouterNavLink
        ref={ref}
        to={to}
        /**
         * className Function
         * 
         * React Router calls this with { isActive, isPending }.
         * We use these to conditionally apply our class names.
         * 
         * cn() handles:
         * - Base className (always)
         * - activeClassName (when isActive is true)
         * - pendingClassName (when isPending is true)
         * - Undefined values (safely ignores them)
         */
        className={({ isActive, isPending }) =>
          cn(
            className,                           // Always applied
            isActive && activeClassName,         // Applied when active
            isPending && pendingClassName        // Applied when pending
          )
        }
        /**
         * Spread Remaining Props
         * 
         * Passes through all other NavLink props:
         * - end: Match exact path
         * - children: Link content
         * - onClick: Click handler
         * - etc.
         */
        {...props}
      />
    );
  },
);

/**
 * Display Name
 * 
 * Sets the component name for React DevTools.
 * Required when using forwardRef (otherwise shows as "Anonymous").
 */
NavLink.displayName = "NavLink";

/* =============================================================================
   EXPORT
   ============================================================================= */

/**
 * Named Export
 * 
 * Export as named export for explicit imports:
 * import { NavLink } from "@/components/NavLink";
 */
export { NavLink };

/* =============================================================================
   USAGE EXAMPLES
   ============================================================================= */

/**
 * EXAMPLE 1: Basic active styling
 * 
 * <NavLink 
 *   to="/dashboard" 
 *   className="text-gray-600 hover:text-gray-900"
 *   activeClassName="text-primary font-bold"
 * >
 *   Dashboard
 * </NavLink>
 * 
 * 
 * EXAMPLE 2: Sidebar navigation
 * 
 * <NavLink
 *   to="/settings"
 *   end  // Only active on exact match (not /settings/profile)
 *   className="flex items-center gap-2 px-3 py-2 rounded-lg"
 *   activeClassName="bg-primary/10 text-primary"
 * >
 *   <SettingsIcon />
 *   Settings
 * </NavLink>
 * 
 * 
 * EXAMPLE 3: With pending state (for slow navigations)
 * 
 * <NavLink
 *   to="/heavy-page"
 *   className="btn"
 *   activeClassName="btn-active"
 *   pendingClassName="btn-loading opacity-50"
 * >
 *   Heavy Page
 * </NavLink>
 */
