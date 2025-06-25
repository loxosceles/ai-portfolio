import { gql } from '@apollo/client';

export const GET_JOB_MATCHING = gql`
  query GetJobMatching {
    getJobMatching {
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

export const GET_DEVELOPER_WITH_JOB_MATCHING = gql`
  query GetDeveloperWithJobMatching($id: ID!) {
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
    getJobMatching {
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
