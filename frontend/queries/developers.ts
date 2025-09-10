import { gql } from '@apollo/client';

export const GET_DEVELOPER_WITH_PROJECTS = gql`
  query GetDeveloperWithProjects {
    getDeveloper {
      id
      name
      title
      github
      linkedin
      telegram
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
      projects(sortOrder: ASC) {
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
        icon
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
        technicalShowcases {
          title
          description
          highlights
        }
        archPatterns
        performance
        repositoryAndDevelopment {
          plannedFeatures
          vision
        }
      }
    }
  }
`;
