import Image from 'next/image';

function IconWrapper({
  className,
  height = 100,
  width = 100,
  icon
}: {
  className?: string;
  height?: number;
  width?: number;
  icon?: string;
}) {
  if (!icon) {
    return null;
  }

  return (
    <div className={className ? `${className} invert` : 'invert'}>
      <Image src={`/${icon}.svg`} alt={`${icon} icon`} width={width} height={height} />
    </div>
  );
}

export default IconWrapper;
