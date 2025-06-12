import Image from "next/image";

function IconWrapper({
  className,
  height = 100,
  width = 100,
  icon,
}: {
  className?: string;
  height?: number;
  width?: number;
  icon?: string;
}) {
  return (
    <div className={`${className} invert`}>
      <Image
        src={`/${icon}.svg`}
        alt="Github Icon"
        width={width}
        height={height}
      />
    </div>
  );
}

export default IconWrapper;
