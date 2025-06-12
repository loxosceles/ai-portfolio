'use client';

import { useState, useEffect } from 'react';
import { client } from '@/lib/amplify';
import type { Schema } from '@/lib/amplify';

type Developer = Schema['Developer']['type'];
type Project = Schema['Project']['type'];

export function useDeveloper() {
  const [developer, setDeveloper] = useState<Developer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDeveloper = async () => {
      try {
        const { data: developers } = await client.models.Developer.list();
        if (developers && developers.length > 0) {
          setDeveloper(developers[0]);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to fetch developer data'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchDeveloper();
  }, []);

  return { developer, loading, error };
}

export function useProjects(options?: {
  featured?: boolean;
  status?: string;
  limit?: number;
}) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        let query = client.models.Project.list();

        // Apply filters if provided
        if (options?.featured !== undefined || options?.status) {
          const filters: any = {};
          if (options.featured !== undefined) {
            filters.featured = { eq: options.featured };
          }
          if (options.status) {
            filters.status = { eq: options.status };
          }
          query = client.models.Project.list({ filter: filters });
        }

        const { data } = await query;
        let projectList = data || [];

        // Apply limit if provided
        if (options?.limit) {
          projectList = projectList.slice(0, options.limit);
        }

        // Sort by order field, then by creation date
        projectList.sort((a, b) => {
          if (a.order !== undefined && b.order !== undefined) {
            return (a.order ?? 0) - (b.order ?? 0);
          }
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        });

        setProjects(projectList);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to fetch projects'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, [options?.featured, options?.status, options?.limit]);

  return { projects, loading, error };
}

export function useProject(id: string) {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const { data } = await client.models.Project.get({ id });
        setProject(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to fetch project'
        );
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchProject();
    }
  }, [id]);

  return { project, loading, error };
}
