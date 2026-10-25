import { type FC, type SVGProps } from "react";
import { cn } from "@/lib/utils";

export interface SocialLinks {
  instagram?: string | undefined;
  facebook?: string | undefined;
  tiktok?: string | undefined;
  x?: string | undefined;
  youtube?: string | undefined;
  [key: string]: string | undefined;
}

export function formatSocialUrl(
  platform: "instagram" | "facebook" | "tiktok" | "x" | "youtube",
  handleOrUrl?: string
): string | null {
  if (!handleOrUrl || !handleOrUrl.trim()) return null;
  const trimmed = handleOrUrl.trim();

  // If already starts with http:// or https://
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  // If user entered domain like instagram.com/... or www.instagram.com/...
  if (/^(www\.)?(instagram\.com|facebook\.com|tiktok\.com|x\.com|twitter\.com|youtube\.com|youtu\.be)\//i.test(trimmed)) {
    return `https://${trimmed.replace(/^www\./i, "")}`;
  }

  // Treat as handle / username
  const cleanHandle = trimmed.replace(/^@+/, "").trim();
  if (!cleanHandle) return null;

  switch (platform) {
    case "instagram":
      return `https://instagram.com/${cleanHandle}`;
    case "facebook":
      return `https://facebook.com/${cleanHandle}`;
    case "tiktok":
      return `https://www.tiktok.com/@${cleanHandle}`;
    case "x":
      return `https://x.com/${cleanHandle}`;
    case "youtube":
      return `https://youtube.com/@${cleanHandle}`;
    default:
      return null;
  }
}


export const InstagramIcon: FC<SVGProps<SVGSVGElement>> = (props) => (
  <svg
    viewBox="0 0 24 24"
    width="20"
    height="20"
    fill="currentColor"
    aria-hidden="true"
    {...props}
  >
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
  </svg>
);

export const FacebookIcon: FC<SVGProps<SVGSVGElement>> = (props) => (
  <svg
    viewBox="0 0 24 24"
    width="20"
    height="20"
    fill="currentColor"
    aria-hidden="true"
    {...props}
  >
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

export const TikTokIcon: FC<SVGProps<SVGSVGElement>> = (props) => (
  <svg
    viewBox="0 0 24 24"
    width="20"
    height="20"
    fill="currentColor"
    aria-hidden="true"
    {...props}
  >
    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-1.01-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 2.89 3.5 2.75 1.28-.01 2.45-.75 2.95-1.92.3-.64.44-1.35.42-2.07.03-4.52.02-9.04.02-13.56z" />
  </svg>
);

export const YouTubeIcon: FC<SVGProps<SVGSVGElement>> = (props) => (
  <svg
    viewBox="0 0 24 24"
    width="20"
    height="20"
    fill="currentColor"
    aria-hidden="true"
    {...props}
  >
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
);

export const XIcon: FC<SVGProps<SVGSVGElement>> = (props) => (
  <svg
    viewBox="0 0 24 24"
    width="20"
    height="20"
    fill="currentColor"
    aria-hidden="true"
    {...props}
  >
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

interface SocialIconsListProps {
  socialLinks?: SocialLinks | string | null;
  className?: string;
  iconClassName?: string;
  buttonClassName?: string;
}

export function SocialIconsList({
  socialLinks,
  className,
  iconClassName,
  buttonClassName,
}: SocialIconsListProps) {
  if (!socialLinks) return null;

  let linksObj: SocialLinks = {};
  if (typeof socialLinks === "string") {
    try {
      const parsed = JSON.parse(socialLinks);
      linksObj = typeof parsed === "string" ? JSON.parse(parsed) : parsed;
    } catch {
      linksObj = {};
    }
  } else if (typeof socialLinks === "object") {
    linksObj = socialLinks;
  }

  const platforms = [
    {
      key: "instagram" as const,
      label: "Instagram",
      url: formatSocialUrl("instagram", linksObj.instagram),
      Icon: InstagramIcon,
      hoverClass: "hover:text-[#E4405F] hover:border-[#E4405F]/40 hover:bg-[#E4405F]/10",
    },
    {
      key: "facebook" as const,
      label: "Facebook",
      url: formatSocialUrl("facebook", linksObj.facebook),
      Icon: FacebookIcon,
      hoverClass: "hover:text-[#1877F2] hover:border-[#1877F2]/40 hover:bg-[#1877F2]/10",
    },
    {
      key: "tiktok" as const,
      label: "TikTok",
      url: formatSocialUrl("tiktok", linksObj.tiktok),
      Icon: TikTokIcon,
      hoverClass: "hover:text-[#25F4EE] hover:border-[#25F4EE]/40 hover:bg-[#25F4EE]/10",
    },
    {
      key: "x" as const,
      label: "X (Twitter)",
      url: formatSocialUrl("x", linksObj.x),
      Icon: XIcon,
      hoverClass: "hover:text-white hover:border-white/40 hover:bg-white/10",
    },
    {
      key: "youtube" as const,
      label: "YouTube",
      url: formatSocialUrl("youtube", linksObj.youtube),
      Icon: YouTubeIcon,
      hoverClass: "hover:text-[#FF0000] hover:border-[#FF0000]/40 hover:bg-[#FF0000]/10",
    },
  ];

  const activePlatforms = platforms.filter((p) => Boolean(p.url));

  if (activePlatforms.length === 0) {
    return null;
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-2.5", className)}>
      {activePlatforms.map(({ key, label, url, Icon, hoverClass }) => (
        <a
          key={key}
          href={url!}
          target="_blank"
          rel="noopener noreferrer"
          title={label}
          aria-label={label}
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-full bg-elevated/70 text-muted-foreground transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm",
            hoverClass,
            buttonClassName
          )}
        >
          <Icon className={cn("h-4 w-4 shrink-0 transition-transform", iconClassName)} />
        </a>
      ))}
    </div>
  );
}
