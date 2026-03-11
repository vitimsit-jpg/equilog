interface Props {
  name: string;
  photoUrl?: string | null;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
  rounded?: "full" | "xl" | "lg";
}

const SIZE_CLASSES = {
  xs: "w-6 h-6 text-xs",
  sm: "w-8 h-8 text-sm",
  md: "w-9 h-9 text-sm",
  lg: "w-10 h-10 text-base",
};

export default function HorseAvatar({ name, photoUrl, size = "md", className = "", rounded = "xl" }: Props) {
  const sizeClass = SIZE_CLASSES[size];
  const roundedClass = rounded === "full" ? "rounded-full" : rounded === "xl" ? "rounded-xl" : "rounded-lg";

  if (photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoUrl}
        alt={name}
        className={`${sizeClass} ${roundedClass} object-cover flex-shrink-0 ${className}`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} ${roundedClass} bg-black text-white font-black flex items-center justify-center flex-shrink-0 ${className}`}
    >
      {name[0].toUpperCase()}
    </div>
  );
}
