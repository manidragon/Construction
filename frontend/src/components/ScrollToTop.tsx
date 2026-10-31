import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Universal ScrollToTop Component
 * Guarantees that every page navigation and route change immediately resets
 * scroll position to the very top across all scrollable containers (window, document,
 * main-scroll-container, and child overflow containers).
 * Prevents pages from opening in the middle after scrolling down previous pages.
 */
export const ScrollToTop = () => {
  const { pathname, search, key } = useLocation();

  useEffect(() => {
    // Disable browser's automatic scroll restoration which often restores old scroll positions
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }

    const resetScroll = () => {
      // 1. Reset window and document roots
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
      if (document.documentElement) document.documentElement.scrollTop = 0;
      if (document.body) document.body.scrollTop = 0;

      // 2. Reset the main application layout, superadmin, and login scroll containers
      const mainContainer = document.getElementById('main-scroll-container');
      if (mainContainer) {
        mainContainer.scrollTop = 0;
      }
      const superadminContainer = document.getElementById('superadmin-scroll-container');
      if (superadminContainer) {
        superadminContainer.scrollTop = 0;
      }
      const loginContainer = document.getElementById('login-scroll-container');
      if (loginContainer) {
        loginContainer.scrollTop = 0;
      }

      // 3. Reset any child scrollable elements
      const scrollables = document.querySelectorAll('#main-scroll-container [class*="overflow-y-auto"], #main-scroll-container [class*="overflow-auto"]');
      scrollables.forEach((el) => {
        (el as HTMLElement).scrollTop = 0;
      });
    };

    resetScroll();

    // Re-run on next frame and after brief delay in case route content mounts asynchronously
    const raf = requestAnimationFrame(resetScroll);
    const timeout = setTimeout(resetScroll, 60);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timeout);
    };
  }, [pathname, search, key]);

  return null;
};

export default ScrollToTop;
