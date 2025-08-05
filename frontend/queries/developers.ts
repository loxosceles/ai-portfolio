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
        slug
        description
        status
        highlights
        techStack
        githubUrl
        liveUrl
        imageUrl
        startDate
        endDate
        featured
        order
        overview
        challenge
        solution
        architecture {
          name
          details
        }
        codeExamples {
          name
          code
        }
        archPatterns
        performance
      }
    }
  }
`;
