// lib/hooks/useApolloPortfolio.ts - Apollo-based hooks
import { useQuery, useMutation } from '@apollo/client';
import { gql } from '@apollo/client';

// Define GraphQL queries
export const GET_DEVELOPERS = gql`
  query GetDevelopers {
    listDevelopers {
      items {
        id
        name
        title
        bio
        email
        website
        github
        linkedin
        location
        yearsOfExperience
        skills
        isActive
        createdAt
        updatedAt
      }
    }
  }
`;

export const GET_FEATURED_PROJECTS = gql`
  query GetFeaturedProjects {
    listProjects(filter: { featured: { eq: true } }) {
      items {
        id
        title
        description
        status
        highlights
        tech
        githubUrl
        liveUrl
        imageUrl
        startDate
        endDate
        featured
        order
        developer {
          id
          name
          title
        }
        createdAt
        updatedAt
      }
    }
  }
`;

export const CREATE_PROJECT = gql`
  mutation CreateProject($input: CreateProjectInput!) {
    createProject(input: $input) {
      id
      title
      description
      status
      highlights
      tech
      githubUrl
      liveUrl
      imageUrl
      startDate
      endDate
      featured
      order
      developerId
      createdAt
      updatedAt
    }
  }
`;

// Custom hooks using Apollo
export function useApolloDeveloper() {
  const { data, loading, error, refetch } = useQuery(GET_DEVELOPERS);

  return {
    developer: data?.listDevelopers?.items?.[0] || null,
    developers: data?.listDevelopers?.items || [],
    loading,
    error,
    refetch
  };
}

export function useApolloFeaturedProjects() {
  const { data, loading, error, refetch } = useQuery(GET_FEATURED_PROJECTS);

  return {
    projects: data?.listProjects?.items || [],
    loading,
    error,
    refetch
  };
}

export function useCreateProject() {
  const [createProject, { data, loading, error }] = useMutation(
    CREATE_PROJECT,
    {
      // Refetch queries after mutation
      refetchQueries: [GET_FEATURED_PROJECTS]
    }
  );

  return {
    createProject,
    data,
    loading,
    error
  };
}
