'use client';

import { useState } from 'react';
import { useLazyQuery, gql } from '@apollo/client';
import { cookieAuth } from '@/lib/auth/cookie-auth';

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
  const ask = (question: string) => {
    const { accessToken: currentToken } = cookieAuth.getTokens();
    if (!currentToken) {
      console.error('❌ AI ADVOCATE: accessToken is null/undefined when executing query');
      console.error('❌ cookieAuth.getTokens():', cookieAuth.getTokens());
      setError('Authentication token not available');
      return;
    }
    setIsLoading(true);
    setError(null);
    askQuestion({
      variables: { question },
      context: {
        headers: {
          Authorization: `Bearer ${currentToken}`
        }
      }
    });
  };

  return {
    ask,
    response,
    isLoading: isLoading || loading,
    error
  };
}
