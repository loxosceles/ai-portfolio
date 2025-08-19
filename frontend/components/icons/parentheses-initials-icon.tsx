interface ParenthesesInitialsIconProps {
  className?: string;
}

export default function ParenthesesInitialsIcon({
  className = 'h-6 w-6'
}: ParenthesesInitialsIconProps) {
  return (
    <svg className={className} viewBox="0 0 100 100" fill="none">
      <path
        d="M20 15 C5 20, 5 80, 20 85"
        stroke="currentColor"
        strokeWidth="10"
        strokeLinecap="round"
      />
      <path
        d="M80 15 C95 20, 95 80, 80 85"
        stroke="currentColor"
        strokeWidth="10"
        strokeLinecap="round"
      />
      <path
        d="M30 75 L30 25 L42 55 L58 25 L58 75"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M62 25 L62 75 M62 50 L85 50 M85 25 L85 75"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
      />
    </svg>
  );
}
