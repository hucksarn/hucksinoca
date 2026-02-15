/**
 * Global error logger — intercepts unhandled errors and promise rejections
 * and logs them with context for easier debugging.
 */

const originalConsoleError = console.error;

export function setupGlobalErrorLogging() {
  // Intercept unhandled errors
  window.addEventListener('error', (event) => {
    originalConsoleError(
      `[GlobalError] Unhandled Error:\n` +
      `Message: ${event.message}\n` +
      `Source: ${event.filename}:${event.lineno}:${event.colno}\n` +
      `Error:`, event.error
    );
  });

  // Intercept unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    originalConsoleError(
      `[GlobalError] Unhandled Promise Rejection:\n` +
      `Reason:`, event.reason
    );
  });

  // Wrap fetch to log failed requests
  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request).url;
    try {
      const response = await originalFetch(...args);
      if (!response.ok) {
        const body = await response.clone().text();
        console.warn(
          `[FetchError] ${response.status} ${response.statusText}\n` +
          `URL: ${url}\n` +
          `Body: ${body.slice(0, 500)}`
        );
      }
      return response;
    } catch (error) {
      originalConsoleError(
        `[FetchError] Network error\n` +
        `URL: ${url}\n` +
        `Error:`, error
      );
      throw error;
    }
  };
}
