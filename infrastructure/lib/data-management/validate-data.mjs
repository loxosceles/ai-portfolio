/**
 * Validates the relationship between developers and projects data
 * @param {Array} developers - Array of developer objects
 * @param {Array} projects - Array of project objects
 * @throws {Error} If validation fails
 */
export function validateData(developers, projects) {
  // Get all developer IDs
  const developerIds = developers.map((dev) => dev.id);

  // Validate each project has a developerId that exists
  projects.forEach((project) => {
    if (!project.developerId) {
      throw new Error(`Project ${project.id} is missing developerId`);
    }
    if (!developerIds.includes(project.developerId)) {
      throw new Error(
        `Project ${project.id} references non-existent developer ${project.developerId}`
      );
    }
  });

  // Validate skillSets structure if present
  developers.forEach((developer) => {
    if (developer.skillSets && !Array.isArray(developer.skillSets)) {
      throw new Error(`Developer ${developer.id} skillSets must be an array`);
    }

    if (developer.skillSets) {
      developer.skillSets.forEach((skillSet, index) => {
        // Check for required ID
        if (!skillSet.id) {
          throw new Error(`Developer ${developer.id} skillSet at index ${index} is missing id`);
        }
        // Check for required name
        if (!skillSet.name) {
          throw new Error(`Developer ${developer.id} skillSet at index ${index} is missing name`);
        }
        // Check skills array
        if (!Array.isArray(skillSet.skills)) {
          throw new Error(
            `Developer ${developer.id} skillSet at index ${index} skills must be an array`
          );
        }
      });
    }
  });
}