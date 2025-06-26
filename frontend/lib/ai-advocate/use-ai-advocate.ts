'use client';

import { useState, useCallback } from 'react';
import { useLazyQuery, gql } from '@apollo/client';

// GraphQL query for asking AI questions
export const ASK_AI_QUESTION = gql`
  query AskAIQuestion($question: String!) {
    askAIQuestion(question: $question) {
      answer
      context
    }
  }
`;

export interface AIResponse {
  answer: string;
  context?: string;
}

export function useAIAdvocate() {
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<AIResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Use lazy query to execute only when needed
  const [askQuestion, { loading }] = useLazyQuery(ASK_AI_QUESTION, {
    onCompleted: (data) => {
      if (data?.askAIQuestion) {
        setResponse(data.askAIQuestion);
      } else {
        // Fallback if no data is returned
        setResponse({
          answer: "I'm sorry, I couldn't generate a response at this time.",
          context: 'The AI service is currently unavailable.'
        });
      }
      setIsLoading(false);
    },
    onError: (error) => {
      console.error('AI query error:', error);
      // Provide a user-friendly error message
      setError("I couldn't connect to my AI brain right now. Please try again later.");
      setIsLoading(false);
    },
    fetchPolicy: 'network-only'
  });

  // Function to ask a question
  const ask = useCallback(
    (question: string) => {
      setIsLoading(true);
      setError(null);
      askQuestion({ variables: { question } });
    },
    [askQuestion]
  );

  return {
    ask,
    response,
    isLoading: isLoading || loading,
    error
  };
}
