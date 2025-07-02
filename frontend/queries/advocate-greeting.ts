import { gql } from '@apollo/client';

export const GET_ADVOCATE_GREETING = gql`
  query GetAdvocateGreeting {
    getAdvocateGreeting {
      linkId
      companyName
      recruiterName
      context
      greeting
      message
      skills
    }
  }
`;

export const GET_DEVELOPER_WITH_ADVOCATE_GREETING = gql`
  query GetDeveloperWithAdvocateGreeting($id: ID!) {
    getDeveloper(id: $id) {
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
        id
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
    getAdvocateGreeting {
      linkId
      companyName
      recruiterName
      context
      greeting
      message
      skills
    }
  }
`;
