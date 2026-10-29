import React, { createContext, useContext, useState, useEffect } from 'react';
import { Project } from '../types';
import api from '../services/api';
import { useAuth } from './AuthContext';

interface ProjectContextType {
  projects: Project[];
  selectedProjectId: string;
  selectedProject: Project | null;
  setSelectedProjectId: (id: string) => void;
  refreshProjects: () => Promise<void>;
  isLoading: boolean;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const fetchProjects = async () => {
    const token = localStorage.getItem('erp_token');
    if (!token || !isAuthenticated) {
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.getProjects();
      if (res.success && res.projects) {
        setProjects(res.projects);
      }
    } catch (err) {
      console.error('Failed to load projects:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchProjects();
    } else {
      setProjects([]);
      setSelectedProjectId('');
    }
  }, [isAuthenticated, user?.id, user?.company?.id]);

  const selectedProject = projects.find((p) => p.id === selectedProjectId) || null;

  return (
    <ProjectContext.Provider
      value={{
        projects,
        selectedProjectId,
        selectedProject,
        setSelectedProjectId,
        refreshProjects: fetchProjects,
        isLoading,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
};

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
};
