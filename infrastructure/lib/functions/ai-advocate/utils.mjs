/**
 * Utility functions for the AI advocate
 * 
 * This module contains utility functions for formatting and processing data
 * for the AI advocate prompt generator.
 */

import PROMPT_RULES from './prompt-rules.mjs';

/**
 * Find matching skills between recruiter interests and developer skills
 * @param {object} recruiterData - Data about the recruiter from the job matching table
 * @param {object} developerData - Developer profile data
 * @returns {object} - Object containing matching skills and other relevant info
 */
export function findRelevantSkills(recruiterData, developerData) {
  // Default result with no matches
  const result = {
    matchingSkills: [],
    allDeveloperSkills: new Set(),
    recruiterSkills: [],
    hasMatches: false
  };

  // If no recruiter data or developer data, return empty result
  if (!recruiterData || !developerData || !developerData.skillSets) {
    return result;
  }

  // Extract recruiter skills (case insensitive)
  const recruiterSkills = recruiterData.requiredSkills || recruiterData.preferredSkills || [];
  result.recruiterSkills = recruiterSkills;

  if (recruiterSkills.length === 0) {
    return result;
  }

  // Create a set of all developer skills (lowercase for case-insensitive matching)
  const developerSkillsMap = new Map(); // Maps lowercase skill to original case

  developerData.skillSets.forEach((skillSet) => {
    if (skillSet.skills && Array.isArray(skillSet.skills)) {
      skillSet.skills.forEach((skill) => {
        const lowerSkill = skill.toLowerCase();
        result.allDeveloperSkills.add(skill);
        developerSkillsMap.set(lowerSkill, skill);
      });
    }
  });

  // Find matching skills
  recruiterSkills.forEach((recruiterSkill) => {
    const lowerRecruiterSkill = recruiterSkill.toLowerCase();

    // Check for exact matches
    if (developerSkillsMap.has(lowerRecruiterSkill)) {
      result.matchingSkills.push({
        skill: developerSkillsMap.get(lowerRecruiterSkill),
        type: 'exact'
      });
      result.hasMatches = true;
      return;
    }

    // Check for partial matches (e.g., "React" matches "React.js")
    for (const [lowerDevSkill, originalDevSkill] of developerSkillsMap.entries()) {
      if (
        lowerDevSkill.includes(lowerRecruiterSkill) ||
        lowerRecruiterSkill.includes(lowerDevSkill)
      ) {
        result.matchingSkills.push({
          skill: originalDevSkill,
          type: 'partial',
          recruiterSkill: recruiterSkill
        });
        result.hasMatches = true;
      }
    }
  });

  return result;
}

/**
 * Formats the skills section of the prompt
 * @param {object} developerData - Developer profile data
 * @param {object} relevantSkills - Result from findRelevantSkills
 * @returns {string} - Formatted skills section
 */
export function formatSkillsSection(developerData, relevantSkills = null) {
  if (!developerData || !developerData.skillSets) {
    return '- Full-stack developer with experience in web development';
  }

  // If we have matching skills, highlight them first
  if (relevantSkills && relevantSkills.hasMatches) {
    const matchingSkillsSection =
      '- Matching skills: ' + relevantSkills.matchingSkills.map((match) => match.skill).join(', ');

    const regularSkillsSection = developerData.skillSets
      .map((skillSet) => {
        return `- ${skillSet.name}: ${skillSet.skills.join(', ')}`;
      })
      .join('\n');

    return matchingSkillsSection + '\n' + regularSkillsSection;
  }

  // Otherwise, return all skills as before
  return developerData.skillSets
    .map((skillSet) => {
      return `- ${skillSet.name}: ${skillSet.skills.join(', ')}`;
    })
    .join('\n');
}

/**
 * Format projects section of the prompt
 * @param {Array} projects - Array of project objects
 * @returns {string} - Formatted projects section
 */
export function formatProjectsSection(projects) {
  if (!projects || projects.length === 0) {
    return '- No projects available';
  }
  
  // Extract and format project information
  return projects.map(project => {
    const technologies = project.tech?.map(t => t.S || t).join(', ') || 'Various technologies';
    return `- ${project.title}: ${technologies}`;
  }).join('\n');
}

/**
 * Formats the experience section of the prompt
 * @param {object} developerData - Developer profile data
 * @returns {string} - Formatted experience section
 */
export function formatExperienceSection(developerData) {
  if (!developerData) {
    return '- Several years of experience in software development';
  }

  const lines = [];

  if (developerData.yearsOfExperience) {
    lines.push(
      `- ${developerData.yearsOfExperience}+ years of experience as a ${developerData.title || 'developer'}`
    );
  }

  if (developerData.bio) {
    lines.push(`- ${developerData.bio}`);
  }

  if (developerData.location) {
    lines.push(`- Based in ${developerData.location}`);
  }

  // Add fallback if no lines were added
  if (lines.length === 0) {
    lines.push('- Experienced developer with a passion for quality code');
  }

  return lines.join('\n');
}

/**
 * Build rules section
 * @param {string} developerName - Developer's name for personalization
 * @returns {string} - Formatted rules section
 */
export function buildRulesSection(developerName) {
  const allRules = [
    ...PROMPT_RULES.accuracy,
    ...PROMPT_RULES.style,
    ...PROMPT_RULES.special
  ].filter(rule => rule);

  const highPriorityRules = allRules.filter(rule => rule.priority === 'high');
  const mediumPriorityRules = allRules.filter(rule => rule.priority === 'medium');
  const lowPriorityRules = allRules.filter(rule => rule.priority === 'low');

  let formattedRules = '';
  if (highPriorityRules.length > 0) {
    formattedRules += 'High Priority:\n' + 
      highPriorityRules.map(rule => `- ${rule.rule.replace(/\[name\]/g, developerName)}`).join('\n') + '\n\n';
  }
  if (mediumPriorityRules.length > 0) {
    formattedRules += 'Medium Priority:\n' + 
      mediumPriorityRules.map(rule => `- ${rule.rule.replace(/\[name\]/g, developerName)}`).join('\n') + '\n\n';
  }
  if (lowPriorityRules.length > 0) {
    formattedRules += 'Low Priority:\n' + 
      lowPriorityRules.map(rule => `- ${rule.rule.replace(/\[name\]/g, developerName)}`).join('\n');
  }

  return `Response Guidelines:\n${formattedRules.trim()}`;
}