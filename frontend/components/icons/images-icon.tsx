interface ImagesIconProps {
  className?: string;
}

export default function ImagesIcon({ className = 'h-6 w-6' }: ImagesIconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM5 19l3.5-4.5 2.5 3.01L14.5 12l4.5 7H5z" />
    </svg>
  );
}
