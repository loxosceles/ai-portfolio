import React, { useState, useRef, useEffect } from 'react';
import { Code, ChevronLeft, ChevronRight } from 'lucide-react';

interface MobileSlidingTabsProps {
  showcases: { title: string; description: string; highlights: string[] }[];
}

export default function MobileSlidingTabs({ showcases }: MobileSlidingTabsProps) {
  const [currentTabIndex, setCurrentTabIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);
  const contentRef = useRef<HTMLDivElement>(null);

  const currentTab = showcases[currentTabIndex];

  const goToPrevious = () => {
    if (currentTabIndex > 0 && !isTransitioning) {
      setIsTransitioning(true);
      setCurrentTabIndex(currentTabIndex - 1);
    }
  };

  const goToNext = () => {
    if (currentTabIndex < showcases.length - 1 && !isTransitioning) {
      setIsTransitioning(true);
      setCurrentTabIndex(currentTabIndex + 1);
    }
  };

  const handleTouchStart = (evt: React.TouchEvent) => {
    touchStartX.current = evt.targetTouches[0].clientX;
  };

  const handleTouchMove = (evt: React.TouchEvent) => {
    touchEndX.current = evt.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;

    const distance = touchStartX.current - touchEndX.current;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      goToNext();
    } else if (isRightSwipe) {
      goToPrevious();
    }
  };

  const handleKeyDown = (evt: React.KeyboardEvent) => {
    if (evt.key === 'ArrowLeft') {
      goToPrevious();
    } else if (evt.key === 'ArrowRight') {
      goToNext();
    }
  };

  useEffect(() => {
    if (isTransitioning) {
      const timer = setTimeout(() => setIsTransitioning(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isTransitioning]);

  const canGoPrevious = currentTabIndex > 0;
  const canGoNext = currentTabIndex < showcases.length - 1;

  return (
    <div
      className="card-glass rounded-xl p-6"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="tabpanel"
      aria-label="Technical showcase navigation"
    >
      <div className="flex items-center mb-6">
        <Code className="h-6 w-6 text-status-warning mr-3" />
        <h3 className="text-xl font-semibold text-primary">Technical Deep Dive</h3>
      </div>

      <div className="flex items-center justify-between mb-4">
        <button
          onClick={goToPrevious}
          disabled={!canGoPrevious}
          aria-label="Previous showcase"
          className={`p-2 transition-colors ${
            canGoPrevious ? 'text-brand-accent hover:text-primary' : 'text-secondary opacity-30'
          }`}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <div className="text-center flex-1">
          <div className="flex justify-center space-x-2 mb-2">
            {showcases.map((_, index) => (
              <button
                key={index}
                onClick={() => !isTransitioning && setCurrentTabIndex(index)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentTabIndex
                    ? 'bg-brand-accent'
                    : 'bg-white/30 border border-white/20 hover:bg-brand-accent/30'
                }`}
                aria-label={`Go to showcase ${index + 1}`}
              />
            ))}
          </div>
          <h4 className="text-lg font-medium text-primary">{currentTab.title}</h4>
        </div>

        <button
          onClick={goToNext}
          disabled={!canGoNext}
          aria-label="Next showcase"
          className={`p-2 transition-colors ${
            canGoNext ? 'text-brand-accent hover:text-primary' : 'text-secondary opacity-30'
          }`}
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div
        ref={contentRef}
        className={`transform transition-all duration-300 ease-in-out space-y-4 ${
          isTransitioning ? 'opacity-50 scale-95' : 'opacity-100 scale-100'
        }`}
      >
        <div className="mb-6">
          <p className="text-secondary leading-relaxed text-sm">{currentTab.description}</p>
        </div>
        <div className="space-y-2">
          {currentTab.highlights.map((highlight, index) => (
            <div key={index} className="flex items-start">
              <span className="text-status-warning mr-2 mt-1 flex-shrink-0">•</span>
              <span className="text-secondary text-sm">{highlight}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
