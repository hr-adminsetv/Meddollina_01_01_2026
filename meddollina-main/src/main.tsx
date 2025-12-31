/**
 * =============================================================================
 * APPLICATION ENTRY POINT
 * =============================================================================
 * 
 * This is the main entry file for the React application. It bootstraps the
 * entire app by mounting the root React component to the DOM.
 * 
 * FILE LOCATION: src/main.tsx
 * 
 * WHAT THIS FILE DOES:
 * 1. Imports the root App component
 * 2. Imports global CSS styles
 * 3. Creates a React root and renders the app
 * 
 * EXECUTION ORDER:
 * 1. index.html loads this file via <script type="module" src="/src/main.tsx">
 * 2. This file runs immediately when the page loads
 * 3. React takes over the #root element in index.html
 * 
 * @file src/main.tsx
 */

/* =============================================================================
   IMPORTS
   ============================================================================= */

/**
 * createRoot from react-dom/client
 * 
 * This is React 18's new way to create a root for rendering.
 * 
 * WHY createRoot INSTEAD OF ReactDOM.render?
 * - ReactDOM.render is deprecated in React 18
 * - createRoot enables concurrent features (Suspense, transitions)
 * - Better performance through automatic batching
 * 
 * WHAT HAPPENS IF YOU USE ReactDOM.render?
 * - Warning in console
 * - Concurrent features won't work
 * - App still works but misses React 18 benefits
 */
import { createRoot } from "react-dom/client";

/**
 * App Component Import
 * 
 * The root component that contains all other components.
 * Everything in the application is rendered inside App.
 * 
 * .tsx EXTENSION:
 * - Explicit extension for TypeScript + JSX
 * - Can be omitted due to Vite's module resolution
 */
import App from "./App.tsx";

/**
 * Global CSS Import
 * 
 * Imports the main stylesheet that includes:
 * - Tailwind CSS base, components, utilities
 * - CSS custom properties (design tokens)
 * - Custom component styles
 * - Animation keyframes
 * 
 * IMPORT ORDER MATTERS:
 * - This should come after component imports
 * - Ensures CSS is processed and bundled correctly
 */
import "./index.css";

// Import debug test in development
if (import.meta.env.DEV) {
  import('./debug-test');
  import('./test-direct-api');
  import('./network-interceptor');
}

/* =============================================================================
   APPLICATION BOOTSTRAP
   ============================================================================= */

/**
 * Mount Point Selection
 * 
 * document.getElementById("root")
 * - Finds the <div id="root"></div> in index.html
 * - This is where our entire React app will be rendered
 * 
 * THE ! (NON-NULL ASSERTION):
 * - TypeScript doesn't know if element exists
 * - ! tells TypeScript "trust me, this exists"
 * - If element doesn't exist, app crashes (which is correct behavior)
 * 
 * WHAT HAPPENS IF #root DOESN'T EXIST?
 * - TypeError: Cannot read property 'render' of null
 * - App fails to start
 * - Check index.html for the root div
 */
const rootElement = document.getElementById("root")!;

/**
 * Create React Root
 * 
 * createRoot initializes a React root that manages:
 * - The virtual DOM for this tree
 * - Rendering and updates
 * - Event delegation
 * - Concurrent rendering features
 */
const root = createRoot(rootElement);

/**
 * Render Application
 * 
 * .render() tells React to:
 * 1. Create the component tree starting from <App />
 * 2. Build the virtual DOM
 * 3. Convert to real DOM elements
 * 4. Insert into the #root element
 * 
 * NO STRICT MODE HERE:
 * - React.StrictMode could be wrapped around <App />
 * - Enables additional checks in development
 * - Double-renders components to find side-effect bugs
 * - Removed for cleaner console output
 * 
 * TO ADD STRICT MODE:
 * import { StrictMode } from 'react';
 * root.render(<StrictMode><App /></StrictMode>);
 */
root.render(<App />);
