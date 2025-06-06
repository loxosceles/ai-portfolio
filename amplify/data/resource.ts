import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

/*== PORTFOLIO SCHEMA ====================================================
This schema defines the data structure for a web developer portfolio with
developer information and project details. The Developer model contains
personal/professional info, while the Project model contains project details
with arrays for highlights and technologies used.
=========================================================================*/
const schema = a.schema({
  Developer: a
    .model({
      name: a.string().required(),
      title: a.string().required(), // e.g., "Full Stack Developer"
      bio: a.string(),
      email: a.string(),
      website: a.string(),
      github: a.string(),
      linkedin: a.string(),
      location: a.string(),
      yearsOfExperience: a.integer(),
      skills: a.string().array(),
      isActive: a.boolean().default(true),
      projects: a.hasMany('Project', 'developerId')
    })
    .authorization((allow) => [
      allow.publicApiKey().to(['read']),
      allow.owner()
    ]),

  Project: a
    .model({
      title: a.string().required(),
      description: a.string().required(),
      status: a.string().required(), // e.g., "Completed", "In Progress", "Planned"
      highlights: a.string().array(), // Array of key highlights/features
      tech: a.string().array(), // Array of technologies used
      githubUrl: a.string(),
      liveUrl: a.string(),
      imageUrl: a.string(),
      startDate: a.date(),
      endDate: a.date(),
      featured: a.boolean().default(false),
      order: a.integer(), // For custom ordering
      developerId: a.id(),
      developer: a.belongsTo('Developer', 'developerId')
    })
    .authorization((allow) => [
      allow.publicApiKey().to(['read']),
      allow.owner()
    ])
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'apiKey',
    apiKeyAuthorizationMode: {
      expiresInDays: 30
    }
  }
});
