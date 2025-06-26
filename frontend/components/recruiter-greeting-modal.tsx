'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useJobMatchingDev } from '@/lib/job-matching/use-job-matching-dev';

function RecruiterGreetingModalContent(): React.ReactElement | null {
  const [isOpen, setIsOpen] = useState(false);
  const [hasShown, setHasShown] = useState(false);
  const [fadeIn, setFadeIn] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Get visitor param for better name display in dev mode
  const searchParams = useSearchParams();
  const visitorParam = searchParams?.get('visitor');

  // Use development-friendly job matching hook
  const { matchingData, isLoading, isAuthenticated } = useJobMatchingDev();

  // Ensure component is mounted before showing modal
  useEffect(() => {
    setMounted(true);
  }, []);

  // Show modal when data is loaded and user is authenticated
  useEffect(() => {
    if (mounted && !isLoading && isAuthenticated && matchingData && !hasShown) {
      // Delay modal appearance slightly for better UX
      const timer = setTimeout(() => {
        setIsOpen(true);
        setHasShown(true);
        // Trigger fade-in animation after modal is positioned
        setTimeout(() => setFadeIn(true), 50);
      }, 800);

      return () => clearTimeout(timer);
    }
  }, [mounted, isLoading, isAuthenticated, matchingData, hasShown]);

  // If not mounted, authenticated, or no data, don't render anything
  if (!mounted || !isAuthenticated || !matchingData || !isOpen) {
    return null;
  }

  const handleClose = () => {
    setIsOpen(false);
  };

  // Static introduction text - will be replaced with AI-generated text in future phases
  const introText =
    matchingData.message ||
    `Welcome to my portfolio! I noticed you're from ${matchingData.companyName || 'your company'}. 
    I have experience with technologies that align well with what you might be looking for. 
    Feel free to explore my projects and skills, and don't hesitate to reach out if you have any questions.`;

  // Format recruiter name nicely
  const recruiterName = matchingData?.recruiterName || '';
  const displayName =
    recruiterName.includes('Recruiter (') && visitorParam
      ? `Visitor ${visitorParam.substring(0, 6)}...`
      : recruiterName;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-[9999]"
      style={{ backgroundColor: 'rgba(255, 255, 255, 0.5)', backdropFilter: 'blur(3px)' }}
    >
      <div
        className={`bg-surface-medium rounded-lg shadow-2xl w-full max-w-md mx-4 overflow-hidden transform transition-all duration-300 ${
          fadeIn ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}
      >
        {/* Modal header */}
        <div className="bg-brand-primary text-primary px-6 py-4 flex justify-between items-center">
          <h3 className="text-lg font-medium">Welcome, {displayName}!</h3>
          <button
            onClick={handleClose}
            className="text-white hover:text-gray-200 focus:outline-none"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Modal body */}
        <div className="px-6 py-4 text-primary">
          {matchingData.companyName && (
            <div className="mb-4">
              <span className="font-semibold">Company:</span> {matchingData.companyName}
            </div>
          )}

          {matchingData.context && (
            <div className="mb-4">
              <span className="font-semibold">Context:</span> {matchingData.context}
            </div>
          )}

          <div className="mb-4">
            <p>{introText}</p>
          </div>

          {matchingData.greeting && matchingData.greeting !== matchingData.message && (
            <div className="mb-4 font-medium">{matchingData.greeting}</div>
          )}

          {matchingData.skills && matchingData.skills.length > 0 && (
            <div className="mb-4">
              <span className="font-semibold">Relevant skills:</span>
              <div className="flex flex-wrap gap-2 mt-2">
                {matchingData.skills.map((skill, index) => (
                  <span key={index} className="tech-tag px-2 py-1 rounded text-sm">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal footer */}
        <div className="bg-surface-light px-6 py-3 flex justify-end">
          <button
            onClick={handleClose}
            className="btn-primary font-medium py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-brand-accent"
          >
            Continue to Portfolio
          </button>
        </div>
      </div>
    </div>
  );
}

function RecruiterGreetingModal(): React.ReactElement {
  return (
    <Suspense fallback={null}>
      <RecruiterGreetingModalContent />
    </Suspense>
  );
}

export default RecruiterGreetingModal;
