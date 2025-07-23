import { gql } from '@apollo/client';

export const GET_DEVELOPER_WITH_PROJECTS = gql`
  query GetDeveloperWithProjects {
    getDeveloper {
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
