import { useCallback, useEffect, useRef, useState } from 'react';

export type GalleryRouteMode = 'hall' | 'project' | 'admin';

function parsePathname(pathname: string): {
  mode: GalleryRouteMode;
  projectId: string | null;
} {
  if (/^\/admin(\/.*)?$/i.test(pathname)) {
    return { mode: 'admin', projectId: null };
  }
  const match = pathname.match(/^\/project\/([^/]+)\/?$/);
  if (match) {
    return { mode: 'project', projectId: decodeURIComponent(match[1]) };
  }
  return { mode: 'hall', projectId: null };
}

export function useGalleryRouter() {
  const initial = parsePathname(window.location.pathname);
  const [routeMode, setRouteMode] = useState<GalleryRouteMode>(initial.mode);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(
    initial.projectId
  );

  // Preserve exhibition hall scroll position when drilling into a project room or admin and returning
  const savedHallScrollY = useRef<number>(0);

  const navigateToAdmin = useCallback(() => {
    if (parsePathname(window.location.pathname).mode === 'hall') {
      savedHallScrollY.current = window.scrollY;
    }
    if (window.location.pathname !== '/admin') {
      window.history.pushState({ admin: true }, '', '/admin');
    }
    setRouteMode('admin');
    setActiveProjectId(null);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  const navigateToProject = useCallback((projectId: string) => {
    if (parsePathname(window.location.pathname).mode === 'hall') {
      savedHallScrollY.current = window.scrollY;
    }
    const nextPath = `/project/${encodeURIComponent(projectId)}`;
    if (window.location.pathname !== nextPath) {
      window.history.pushState({ projectId }, '', nextPath);
    }
    setRouteMode('project');
    setActiveProjectId(projectId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const navigateToHall = useCallback(() => {
    if (window.location.pathname !== '/') {
      window.history.pushState({}, '', '/');
    }
    setRouteMode('hall');
    setActiveProjectId(null);
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: savedHallScrollY.current, behavior: 'smooth' });
    });
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      const parsed = parsePathname(window.location.pathname);
      setRouteMode(parsed.mode);
      setActiveProjectId(parsed.projectId);
      if (parsed.mode === 'hall') {
        window.requestAnimationFrame(() => {
          window.scrollTo({
            top: savedHallScrollY.current,
            behavior: 'instant',
          });
        });
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Global keyboard shortcut: Ctrl + Shift + A (or Cmd + Shift + A) opens /admin
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        e.shiftKey &&
        e.key.toLowerCase() === 'a'
      ) {
        e.preventDefault();
        navigateToAdmin();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigateToAdmin]);

  return {
    routeMode,
    activeProjectId,
    navigateToProject,
    navigateToHall,
    navigateToAdmin,
  };
}
