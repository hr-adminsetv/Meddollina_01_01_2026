/**
 * =============================================================================
 * ROOT APPLICATION COMPONENT
 * =============================================================================
 * 
 * This is the root component that sets up the entire application's:
 * - Global providers (React Query, Tooltips, Toast notifications)
 * - Routing configuration (all pages and navigation)
 * - Layout structure
 * 
 * COMPONENT HIERARCHY:
 * App
 * └── QueryClientProvider (data fetching)
 *     └── TooltipProvider (tooltip context)
 *         └── Toaster (toast notifications)
 *         └── Sonner (alternative toasts)
 *         └── BrowserRouter (routing)
 *             └── AnimatedRoutes (page transitions)
 *                 └── Routes (route definitions)
 *                     └── Individual Pages
 * 
 * @file src/App.tsx
 */

/* =============================================================================
   IMPORTS
   ============================================================================= */

/**
 * UI Component Imports
 * 
 * Toaster: Shadcn toast notification system
 * Sonner: Alternative toast library (both included for flexibility)
 * TooltipProvider: Required wrapper for all tooltips in the app
 */
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

/**
 * React Query Import
 * 
 * QueryClient: Manages caching, background updates, stale data
 * QueryClientProvider: Provides QueryClient to all child components
 * 
 * WHY REACT QUERY?
 * - Handles server state management
 * - Automatic caching and refetching
 * - Loading/error states built-in
 * - Background synchronization
 * 
 * NOTE: Currently not heavily used but ready for API integration
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * React Router Imports
 * 
 * BrowserRouter: Uses browser's History API for clean URLs
 * Routes: Container for Route components
 * Route: Defines a path-to-component mapping
 * Navigate: Declarative navigation/redirect
 * useLocation: Hook to access current route info
 */
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";

/**
 * Internal Component Imports
 */
import { PageTransition } from "./components/PageTransition";
import { ChatProvider } from "./contexts/ChatContext";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import LandingMeddollina from "./pages/LandingMeddollina";
import Login from "./pages/Login";
import ChatHome from "./pages/ChatHome";
import Chat from "./pages/Chat";
import HelpSupport from "./pages/HelpSupport";
import NotFound from "./pages/NotFound";

/* =============================================================================
   CONFIGURATION
   ============================================================================= */

/**
 * QueryClient Instance
 * 
 * Created outside the component to persist across re-renders.
 * 
 * DEFAULT CONFIGURATION INCLUDES:
 * - staleTime: 0 (data becomes stale immediately)
 * - cacheTime: 5 minutes
 * - refetchOnWindowFocus: true
 * - retry: 3 times on failure
 * 
 * TO CUSTOMIZE:
 * const queryClient = new QueryClient({
 *   defaultOptions: {
 *     queries: { staleTime: 60000 } // 1 minute
 *   }
 * });
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0, // Data is stale immediately
      gcTime: 0, // Don't cache data (gcTime is the new name for cacheTime)
      refetchOnWindowFocus: false,
      retry: 1,
    },
    mutations: {
      retry: 1,
    }
  }
});

/**
 * ChatRedirect Component
 * 
 * Redirects /chat to either:
 * - Chat component if there's a conversation ID or initial message
 * - /chathome if no conversation ID (default welcome screen)
 */
const ChatRedirect = () => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const chatId = searchParams.get('id');
  const state = location.state as { initialMessage?: string } | null;
  
  // If there's a chat ID or initial message to process, show the Chat component
  if (chatId || state?.initialMessage) {
    return <Chat />;
  }
  
  // Otherwise, redirect to ChatHome
  return <Navigate to="/chathome" replace />;
};

/* =============================================================================
   ANIMATED ROUTES COMPONENT
   ============================================================================= */

/**
 * AnimatedRoutes Component
 * 
 * Handles routing with different behaviors based on route type:
 * 
 * 1. HELP ROUTE (/help-support):
 *    - Standalone page, no special context
 *    - Separate from main app flow
 * 
 * 2. CHAT ROUTES (/chathome, /chat):
 *    - Wrapped in ChatProvider for shared state
 *    - No page transition (has internal transitions)
 *    - Maintains sidebar state between chat views
 * 
 * 3. ALL OTHER ROUTES:
 *    - Wrapped in PageTransition for animations
 *    - Includes landing, login, 404
 * 
 * WHY SEPARATE FROM App COMPONENT?
 * - useLocation must be used inside BrowserRouter
 * - Keeps App component clean
 * - Easier to manage route-specific logic
 */
const AnimatedRoutes = () => {
  /**
   * useLocation Hook
   * 
   * Returns current location object with:
   * - pathname: Current URL path (e.g., '/chat')
   * - search: Query string (e.g., '?id=123')
   * - state: Navigation state (data passed between routes)
   */
  const location = useLocation();
  
  /**
   * Route Detection
   * 
   * Determines which route category we're on.
   * Used for conditional rendering of providers/wrappers.
   */
  const isChatRoute = location.pathname === '/chathome' || location.pathname === '/chat';
  const isHelpRoute = location.pathname === '/help-support';
  
  /* -------------------------------------------------------------------------
     HELP ROUTE RENDERING
     ------------------------------------------------------------------------- */
  
  /**
   * Help Route
   * 
   * Rendered standalone without providers.
   * Has its own styling and doesn't need chat context.
   */
  if (isHelpRoute) {
    return (
      <Routes location={location}>
        <Route path="/help-support" element={<HelpSupport />} />
      </Routes>
    );
  }
  
  /* -------------------------------------------------------------------------
     CHAT ROUTES RENDERING
     ------------------------------------------------------------------------- */
  
  /**
   * Chat Routes
   * 
   * Wrapped in ChatProvider because:
   * - Sidebar state needs to persist between ChatHome and Chat
   * - Mobile menu state is shared
   * - Avoids prop drilling through components
   * 
   * Protected by ProtectedRoute:
   * - Requires authentication to access
   * - Redirects to login if not authenticated
   * 
   * NO PageTransition:
   * - Chat pages have their own internal animations
   * - Prevents double-animation effect
   */
  if (isChatRoute) {
    return (
      <ProtectedRoute>
        <ChatProvider>
          <Routes location={location}>
            {/* ChatHome: Welcome screen with suggestions */}
            <Route path="/chathome" element={<ChatHome />} />
            
            {/* Chat: Active conversation view or redirect to home */}
            <Route path="/chat" element={<ChatRedirect />} />
          </Routes>
        </ChatProvider>
      </ProtectedRoute>
    );
  }
  
  /* -------------------------------------------------------------------------
     DEFAULT ROUTES RENDERING
     ------------------------------------------------------------------------- */
  
  /**
   * Default Routes
   * 
   * All other routes get page transitions.
   * 
   * KEY PROP on PageTransition:
   * - location.pathname ensures new instance on route change
   * - Triggers exit/enter animations
   */
  return (
    <PageTransition key={location.pathname}>
      <Routes location={location}>
        {/* 
          Root Redirect
          
          "/" redirects to landing page.
          "replace" prevents back button returning to "/"
        */}
        <Route path="/" element={<Navigate to="/landing-meddollina" replace />} />
        
        {/* Landing Page: Marketing/waitlist page */}
        <Route path="/landing-meddollina" element={<LandingMeddollina />} />
        
        {/* Login Page: Authentication screen */}
        <Route path="/login" element={<Login />} />
        
        {/* 404 Catch-All: Any unmatched route */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </PageTransition>
  );
};

/* =============================================================================
   MAIN APP COMPONENT
   ============================================================================= */

/**
 * App Component
 * 
 * The root component that wraps everything in necessary providers.
 * 
 * PROVIDER ORDER (outside to inside):
 * 1. QueryClientProvider: Data fetching context
 * 2. TooltipProvider: Tooltip functionality
 * 3. BrowserRouter: Routing context
 * 
 * PROVIDER ORDER MATTERS:
 * - Components can only use context from providers above them
 * - Toaster needs to be inside TooltipProvider for tooltip-enabled toasts
 * 
 * ARROW FUNCTION SYNTAX:
 * - Concise for simple components
 * - Equivalent to: function App() { return (...); }
 */
const App = () => (
  /**
   * QueryClientProvider
   * 
   * Provides React Query's QueryClient to all descendants.
   * Enables useQuery, useMutation hooks throughout app.
   */
  <QueryClientProvider client={queryClient}>
    {/* 
      TooltipProvider
      
      Required for Radix UI tooltips to work.
      Must wrap any component using tooltips.
    */}
    <TooltipProvider>
      {/* 
        Toast Notification Systems
        
        Toaster: Shadcn/Radix based toasts
        Sonner: Alternative toast library
        
        Both included for flexibility - use whichever fits the context
      */}
      <Toaster />
      <Sonner />
      
      {/* 
        BrowserRouter
        
        Enables client-side routing.
        Uses HTML5 History API for clean URLs.
        
        ALTERNATIVES:
        - HashRouter: Uses # in URLs (/#/chat)
        - MemoryRouter: For testing (no URL changes)
      */}
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        {/* 
          AuthProvider
          
          Provides authentication context to all routes.
          Must be inside BrowserRouter to access navigation.
        */}
        <AuthProvider>
          <AnimatedRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

/* =============================================================================
   EXPORT
   ============================================================================= */

/**
 * Default Export
 * 
 * Exports App as the default export.
 * Imported in main.tsx for rendering.
 */
export default App;
