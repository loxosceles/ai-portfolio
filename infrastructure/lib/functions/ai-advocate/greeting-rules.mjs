const GREETING_RULES = [
  {
    priority: 'high',
    rule: "Create a warm, personalized greeting that welcomes the recruiter to [name]'s portfolio."
  },
  { priority: 'high', rule: 'Keep the greeting concise - 2-3 sentences maximum.' },
  { priority: 'high', rule: "Mention the recruiter's name and company in the greeting." },
  {
    priority: 'high',
    rule: "If the recruiter has specific skills of interest, briefly highlight [name]'s relevant experience."
  },
  { priority: 'medium', rule: 'Use a professional but friendly tone.' },
  { priority: 'medium', rule: 'Do not use generic phrases like "I hope this finds you well".' },
  { priority: 'medium', rule: 'Focus on making a positive first impression.' },
  {
    priority: 'low',
    rule: "Avoid technical jargon unless it directly relates to the recruiter's interests."
  }
];
