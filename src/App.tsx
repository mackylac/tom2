import React from 'react';
import { StudioManagerModal } from './components/StudioManagerModal';
import { PortfolioProvider, usePortfolio } from './context/PortfolioContext';
import { useGalleryRouter } from './hooks/useGalleryRouter';
import { AdminDashboard } from './pages/AdminDashboard';
import { ExhibitionHall } from './pages/ExhibitionHall';
import { ProjectRoom } from './pages/ProjectRoom';

const GalleryApplicationShell: React.FC = () => {
  const { projects, visibleProjects } = usePortfolio();
  const {
    routeMode,
    activeProjectId,
    navigateToProject,
    navigateToHall,
    navigateToAdmin,
  } = useGalleryRouter();

  if (routeMode === 'admin') {
    return (
      <AdminDashboard
        onBackToGallery={navigateToHall}
        onPreviewProject={navigateToProject}
      />
    );
  }

  const activeIndex = activeProjectId
    ? projects.findIndex((p) => p.id === activeProjectId)
    : -1;

  const activeProject = activeIndex >= 0 ? projects[activeIndex] : null;
  const pool = visibleProjects.length > 0 ? visibleProjects : projects;
  const currentInPoolIdx = activeProject
    ? pool.findIndex((p) => p.id === activeProject.id)
    : -1;
  const nextProject =
    currentInPoolIdx >= 0 && pool.length > 0
      ? pool[(currentInPoolIdx + 1) % pool.length]
      : pool[0];

  return (
    <>
      {routeMode === 'project' && activeProject && nextProject ? (
        <ProjectRoom
          key={activeProject.id}
          project={activeProject}
          nextProject={nextProject}
          onBackToHall={navigateToHall}
          onSelectProject={navigateToProject}
          onOpenAdmin={navigateToAdmin}
        />
      ) : (
        <ExhibitionHall
          onSelectProject={navigateToProject}
          onOpenAdmin={navigateToAdmin}
        />
      )}

      <StudioManagerModal />
    </>
  );
};

export function App() {
  return (
    <PortfolioProvider>
      <GalleryApplicationShell />
    </PortfolioProvider>
  );
}

export default App;
