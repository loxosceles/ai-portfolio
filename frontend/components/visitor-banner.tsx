'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Cookies from 'js-cookie';
import { useSearchParams } from 'next/navigation';
import { useJobMatching } from '../lib/job-matching/use-job-matching';

function VisitorBannerContent(): React.ReactElement | null {
  const [isLoading, setIsLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(true);
  const [visitorInfo, setVisitorInfo] = useState({
    company: '',
    name: '',
    context: ''
  });

  // Use job matching hook to get personalized data
  const { matchingData, isLoading: isLoadingMatching } = useJobMatching();

  const searchParams = useSearchParams();
  const visitorQParam = searchParams.get('visitor');

  useEffect(() => {
    // Only set cookies if they don't exist and we have a visitor hash
    if (
      visitorQParam === 'test123' &&
      process.env.NODE_ENV === 'development' &&
      !Cookies.get('visitor_company')
    ) {
      // Set development cookies
      Cookies.set('visitor_company', 'Test Company', {
        path: '/',
        sameSite: 'lax'
      });
      Cookies.set('visitor_name', 'John Doe', {
        path: '/',
        sameSite: 'lax'
      });
      Cookies.set('visitor_context', 'engineering', {
        path: '/',
        sameSite: 'lax'
      });
    }

    // Read current cookies or use matching data if available
    setVisitorInfo({
      company:
        matchingData?.companyName || decodeURIComponent(Cookies.get('visitor_company') || ''),
      name: matchingData?.recruiterName || decodeURIComponent(Cookies.get('visitor_name') || ''),
      context: matchingData?.context || decodeURIComponent(Cookies.get('visitor_context') || '')
    });
    setIsLoading(false);
  }, [visitorQParam, matchingData]);

  // Handle main content margin adjustment
  useEffect(() => {
    const mainContent = document.querySelector('main');
    if (
      mainContent &&
      !isLoading &&
      isVisible &&
      (visitorInfo.company || visitorInfo.name || visitorInfo.context || matchingData?.greeting)
    ) {
      mainContent.style.transition = 'margin-top 0.3s ease';
      mainContent.style.marginTop = '6rem'; // Increased for potential message content
    } else if (mainContent) {
      mainContent.style.marginTop = '0';
    }

    return () => {
      if (mainContent) {
        mainContent.style.marginTop = '0';
      }
    };
  }, [isLoading, isVisible, visitorInfo, matchingData]);

  if (
    isLoading ||
    !isVisible ||
    (!visitorInfo.company && !visitorInfo.name && !visitorInfo.context && !matchingData?.greeting)
  ) {
    return null;
  }

  const handleClose = () => {
    // Just hide the banner
    setIsVisible(false);

    // Only clear the URL parameter in development, keep cookies
    if (process.env.NODE_ENV === 'development') {
      const url = new URL(window.location.href);
      url.searchParams.delete('visitor');
      window.history.replaceState({}, '', url.toString());
    }
  };

  return (
    <div className="fixed top-0 left-0 right-0 bg-blue-600 text-white p-4 z-[9999] transition-transform duration-300">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex flex-col gap-1">
          <div className="flex gap-4">
            {visitorInfo.company && <span>Company: {visitorInfo.company}</span>}
            {visitorInfo.name && <span>Name: {visitorInfo.name}</span>}
            {visitorInfo.context && <span>Context: {visitorInfo.context}</span>}
            {process.env.NODE_ENV === 'development' && (
              <span className="text-yellow-300">[Development Mode]</span>
            )}
          </div>
          {matchingData?.greeting && (
            <div className="text-lg font-medium">{matchingData.greeting}</div>
          )}
          {matchingData?.message && <div className="text-sm">{matchingData.message}</div>}
        </div>
        <button
          onClick={handleClose}
          className="text-white hover:text-gray-200"
          aria-label="Close banner"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

function VisitorBanner(): React.ReactElement {
  return (
    <Suspense fallback={null}>
      <VisitorBannerContent />
    </Suspense>
  );
}

export default VisitorBanner;
