'use client';

import React, { useState } from 'react';
import { useAIAdvocate } from '@/lib/ai-advocate/use-ai-advocate';
import { useAIAdvocateDev } from '@/lib/ai-advocate/use-ai-advocate-dev';

interface AIQuestionProps {
  onClose: () => void;
}

export default function AIQuestion({ onClose }: AIQuestionProps) {
  const [question, setQuestion] = useState('');
  // For client components, we need to use NEXT_PUBLIC_ prefixed variables
  const environment = process.env.NEXT_PUBLIC_ENVIRONMENT || 'local';
  const isLocal = environment === 'local';

  // Always call both hooks but only use the appropriate one
  const devHook = useAIAdvocateDev();
  const prodHook = useAIAdvocate();

  const { ask, response, isLoading, error } = isLocal ? devHook : prodHook;

  // Add keyboard event listener to close modal with Escape key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (question.trim()) {
      ask(question);
    }
  };

  // Handle click outside to close modal
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-[9999]"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(3px)' }}
      onClick={handleBackdropClick}
    >
      <div className="w-full max-w-2xl mx-4 p-6 bg-surface-medium rounded-lg shadow-2xl animate-fadeIn border border-brand-accent border-opacity-30">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-brand-accent">Ask AI About Me</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-brand-accent focus:outline-none transition-colors"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask a question about my skills or experience..."
              className="flex-grow p-3 rounded-lg border border-subtle bg-surface-dark text-primary focus:outline-none focus:ring-2 focus:ring-brand-accent transition-all"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !question.trim()}
              className="btn-primary py-3 px-6 rounded-lg disabled:opacity-50 font-medium transition-all hover:shadow-lg flex items-center justify-center min-w-[100px]"
            >
              {isLoading ? (
                <span className="flex items-center">
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Thinking...
                </span>
              ) : (
                'Ask'
              )}
            </button>
          </div>
        </form>

        {error && (
          <div className="p-4 bg-red-900 bg-opacity-20 border-l-4 border-red-700 rounded-lg text-red-400 mb-6 animate-fadeIn">
            <div className="flex items-center">
              <span className="mr-2">⚠</span>
              <span>{error}</span>
            </div>
          </div>
        )}

        {response && (
          <div className="mt-6 animate-fadeIn">
            <div className="p-5 bg-surface-light rounded-lg border-l-4 border-brand-accent">
              <p className="text-primary whitespace-pre-line leading-relaxed">{response.answer}</p>
              {response.context && (
                <p className="mt-3 text-sm text-muted italic">{response.context}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
