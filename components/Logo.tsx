import Image from "next/image";
import { cx } from "@/lib/utils";

interface LogoProps {
  size?: number; // mark height in px
  showWordmark?: boolean;
  className?: string;
}

export function Logo({ size = 24, showWordmark = true, className }: LogoProps) {
  return (
    <span className={cx("inline-flex items-center gap-2.5", className)}>
      <Image
        src="/logo-white.png"
        alt="Scout"
        width={size}
        height={size}
        priority
        style={{ height: size, width: "auto" }}
      />
      {showWordmark && (
        <span
          className="font-medium tracking-tight text-text-primary"
          style={{ fontSize: size * 0.75 }}
        >
          Scout
        </span>
      )}
    </span>
  );
}
