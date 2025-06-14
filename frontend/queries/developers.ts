import { gql } from '@apollo/client';

export const GET_DEVELOPER = gql`
  query GetDeveloper($id: ID!) {
    getDeveloper(id: $id) {
      id
      name
      email
      title
      skillSets {
        name
        skills
      }
      bio
      github
      linkedin
      website
      location
      yearsOfExperience
      isActive
    }
  }
`;

export const LIST_DEVELOPERS = gql`
  query ListDevelopers {
    listDevelopers {
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
      skillSets {
        name
        skills
      }
      isActive
    }
  }
`;

export const GET_PROJECT = gql`
  query GetProject($id: ID!) {
    getProject(id: $id) {
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
    }
  }
`;
``;

export const GET_DEVELOPER_WITH_PROJECTS = gql`
  query GetDeveloperWithProjects($id: ID!) {
    getDeveloper(id: $id) {
      id
      name
      title
      github
      linkedin
      website
      bio
      email
      location
      yearsOfExperience
      skillSets {
        name
        skills
      }
      isActive
      projects {
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
      }
    }
  }
`;
