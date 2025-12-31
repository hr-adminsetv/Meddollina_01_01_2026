/**
 * Network Request Interceptor
 * Intercepts all fetch and XMLHttpRequest to see actual requests
 */

// Store original fetch
const originalFetch = window.fetch;
window.fetch = function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
  
  if (url.includes('/api/ai/chat')) {
    console.log('[Network Intercept] Fetch AI Chat Request:', {
      url,
      method: init?.method || 'GET',
      headers: init?.headers,
      body: init?.body && typeof init.body === 'string' ? JSON.parse(init.body) : undefined,
      fullURL: url.startsWith('http') ? url : window.location.origin + url
    });
    
    // Intercept response
    return originalFetch.call(this, input, init).then(response => {
      console.log('[Network Intercept] Fetch AI Chat Response:', {
        status: response.status,
        statusText: response.statusText,
        url: response.url,
        headers: Object.fromEntries(response.headers.entries())
      });
      return response;
    });
  }
  
  return originalFetch.call(this, input, init);
};

// Store original XMLHttpRequest
const OriginalXHR = window.XMLHttpRequest;
const xhrProxy = function(this: XMLHttpRequest) {
  const xhr = new OriginalXHR();
  
  const originalOpen = xhr.open;
  xhr.open = function(method: string, url: string | URL, async?: boolean, user?: string | null, password?: string | null) {
    const urlString = typeof url === 'string' ? url : url.toString();
    
    if (urlString.includes('/api/ai/chat')) {
      console.log('[Network Intercept] XHR AI Chat Request:', {
        method,
        url: urlString,
        fullURL: urlString.startsWith('http') ? urlString : window.location.origin + urlString
      });
      
      // Intercept response
      xhr.addEventListener('load', () => {
        console.log('[Network Intercept] XHR AI Chat Response:', {
          status: xhr.status,
          statusText: xhr.statusText,
          responseURL: xhr.responseURL,
          response: xhr.response
        });
      });
    }
    
    return originalOpen.call(this, method, url, async ?? true, user, password);
  };
  
  return xhr;
} as any;

// Assign the proxy
Object.setPrototypeOf(xhrProxy, OriginalXHR);
Object.setPrototypeOf(xhrProxy.prototype, OriginalXHR.prototype);
window.XMLHttpRequest = xhrProxy;

console.log('[Network Intercept] Active');
