"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { isAppPlatform, platformLabel } from "@/lib/playstation";

export function AppIcon({ className = "h-3 w-auto" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 2048 1024"
      className={className}
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="App"
    >
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="60"
        strokeLinecap="butt"
        strokeLinejoin="round"
      >
        <path d="M70 728 273 318c8-16 18-22 30-22s22 6 30 22l203 410M166 568h274" />
        <path d="M640 728V296h325c132 0 205 54 205 135 0 83-73 137-205 137H640" />
        <path d="M1280 728V296h395c132 0 205 54 205 135 0 83-73 137-205 137h-395" />
      </g>
    </svg>
  );
}

export function PS4Icon({ className = "h-3 w-auto" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 2049 1024"
      className={className}
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="PS4"
    >
      <path d="M1954.284032 634.88h92.16v48.64h-92.16v46.08h-89.6c-7.68 0-5.12-35.84-5.12-46.08H1362.924032c-25.6-2.56-43.52-15.36-28.16-40.96 181.76-115.2 368.64-222.72 552.96-335.36 20.48-10.24 43.52-15.36 58.88 5.12s7.68 17.92 7.68 17.92v304.64z m-97.28-253.44l-417.28 253.44h417.28v-253.44zM98.284032 729.6H8.684032l-5.12-5.12v-143.36c0-2.56 7.68-28.16 10.24-33.28 15.36-35.84 46.08-58.88 87.04-64 125.44-15.36 273.92 12.8 401.92 0 61.44-5.12 69.12-104.96 20.48-130.56s-20.48-7.68-23.04-7.68H1.004032c2.56-12.8-7.68-43.52 7.68-46.08h524.8c148.48 15.36 151.04 222.72-7.68 232.96-125.44 7.68-261.12-7.68-389.12 0-20.48 0-43.52 33.28-43.52 51.2v145.92zM1368.044032 296.96v46.08H1104.364032c-17.92 0-40.96 17.92-48.64 35.84-28.16 76.8 17.92 225.28-20.48 294.4-12.8 23.04-56.32 53.76-84.48 53.76H623.084032c-5.12-15.36-5.12-28.16 0-46.08h276.48c20.48 0 43.52-23.04 48.64-40.96 25.6-79.36-25.6-245.76 33.28-309.76 12.8-15.36 53.76-35.84 74.24-35.84h309.76z" />
    </svg>
  );
}

export function PS5Icon({ className = "h-3 w-auto" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 2048 1024"
      className={className}
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="PS5"
    >
      <path d="M2030.08 291.84c0 2.56 2.56 5.12 2.56 5.12v38.4h-2.56c0 2.56-527.36 2.56-527.36 2.56h-2.56v115.2c0 7.68 15.36 23.04 23.04 23.04 130.56 5.12 268.8-7.68 399.36 0 87.04 5.12 145.92 76.8 120.32 161.28-12.8 46.08-64 89.6-112.64 89.6H1405.44v-46.08h473.6c71.68 0 104.96-92.16 48.64-138.24-30.72-25.6-64-17.92-102.4-15.36-104.96 0-207.36 0-312.32-2.56s-56.32 7.68-81.92-12.8-28.16-28.16-28.16-40.96v-179.2h2.56c0-2.56 622.08-2.56 622.08-2.56zM5.12 337.92s-7.68-46.08 5.12-46.08H537.6c145.92 12.8 140.8 222.72 7.68 232.96-115.2 10.24-243.2-5.12-358.4 0-15.36 0-35.84 0-48.64 10.24C76.8 568.32 110.08 665.6 102.4 721.92c0 2.56 0 5.12-5.12 7.68s-76.8 2.56-81.92 0-5.12-5.12-7.68-10.24c-2.56-99.84-17.92-230.4 115.2-240.64 120.32-10.24 253.44 10.24 371.2 0 120.32-10.24 81.92-74.24 46.08-115.2s-33.28-25.6-46.08-25.6H5.12zM1021.44 291.84h289.28v43.52h-2.56c0 2.56-238.08 2.56-238.08 2.56-25.6 0-56.32 35.84-61.44 61.44-10.24 76.8 20.48 217.6-20.48 279.04s-56.32 53.76-89.6 53.76h-281.6v-43.52h2.56c0-2.56 222.72-2.56 222.72-2.56 5.12 0 20.48-2.56 25.6-5.12 30.72-10.24 46.08-38.4 48.64-69.12 5.12-69.12-5.12-143.36 0-212.48 5.12-56.32 51.2-97.28 104.96-104.96z" />
    </svg>
  );
}

export function PS3Icon({ className = "h-3 w-auto" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 630 135"
      className={className}
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="PS3"
    >
      <g transform="translate(-18.609,-19.551)">
        <path d="m 421.659,19.551 h -82.591 c -25.474,0 -37.958,15.741 -37.958,36.179 v 62.087 c 0,12.684 -5.989,21.788 -18.631,21.788 h -72.24 c -0.506,0 -0.925,0.419 -0.925,0.9 v 12.53 c 0,0.512 0.419,0.941 0.925,0.941 h 81.768 c 25.464,0 37.979,-15.67 37.979,-36.118 V 55.73 c 0,-12.694 5.943,-21.818 18.657,-21.818 h 73.017 c 0.573,0 1.023,-0.409 1.023,-0.921 V 20.482 c 0,-0.491 -0.451,-0.931 -1.024,-0.931 z" />
        <path d="M 178.54,19.551 H 19.607 c -0.578,0 -0.998,0.44 -0.998,0.931 v 12.509 c 0,0.512 0.419,0.941 0.998,0.941 h 149.374 c 12.627,0 18.621,9.104 18.621,21.797 0,12.643 -5.994,21.726 -18.621,21.726 H 50.81 c -18.351,0 -32.2,15.415 -32.2,35.862 v 39.687 c 0,0.543 0.419,0.973 0.998,0.973 h 26.927 c 0.527,0 0.967,-0.43 0.967,-0.973 v -39.687 c 0,-12.612 7.247,-21.511 17.762,-21.511 H 178.54 c 25.423,0 37.887,-15.62 37.887,-36.067 0,-20.415 -12.464,-36.188 -37.887,-36.188 z" />
        <path d="m 636.409,85.086 c -0.356,-0.399 -0.356,-1.084 0,-1.473 7.917,-6.557 11.835,-16.438 11.835,-27.874 0,-20.416 -12.438,-36.188 -37.938,-36.188 H 451.414 c -0.542,0 -0.94,0.44 -0.94,0.972 v 12.468 c 0,0.512 0.398,0.941 0.94,0.941 h 149.35 c 12.591,0 18.667,9.104 18.667,21.797 0,12.643 -6.035,21.726 -18.667,21.726 h -0.185 l -149.165,0.031 c -0.542,0 -0.94,0.389 -0.94,0.961 v 12.459 c 0,0.501 0.398,0.9 0.94,0.9 h 149.35 C 617.232,92 619.4,108.038 619.4,116.242 l 0.031,1.544 c 0,12.714 -6.076,21.859 -18.667,21.859 h -149.35 c -0.542,0 -0.94,0.388 -0.94,0.899 v 12.49 c 0,0.512 0.398,0.941 0.94,0.941 h 158.893 c 25.521,0 37.938,-16.939 37.938,-36.189 v -1.544 c -10e-4,-12.274 -3.919,-23.996 -11.836,-31.156 z" />
      </g>
    </svg>
  );
}

export interface PlatformBadgeProps {
  platform: string;
  variant?: "badge" | "inline";
  className?: string;
  badgeVariant?: "secondary" | "outline" | "default";
}

export default function PlatformBadge({
  platform,
  variant = "badge",
  className = "",
  badgeVariant = "secondary",
}: PlatformBadgeProps) {
  const norm = String(platform || "").toLocaleLowerCase();
  const isApp = isAppPlatform(platform);
  const isPs5 = !isApp && norm.includes("ps5");
  const isPs4 = !isApp && !isPs5 && norm.includes("ps4");
  const isPs3 = !isApp && !isPs5 && !isPs4 && norm.includes("ps3");

  if (variant === "inline") {
    if (isApp) {
      return <AppIcon className={className || "h-3.5 w-auto inline-block align-middle"} />;
    }
    if (isPs5) {
      return <PS5Icon className={className || "h-3.5 w-auto inline-block align-middle"} />;
    }
    if (isPs4) {
      return <PS4Icon className={className || "h-3.5 w-auto inline-block align-middle"} />;
    }
    if (isPs3) {
      return <PS3Icon className={className || "h-3.5 w-auto inline-block align-middle"} />;
    }
    return <span className={className}>{platformLabel(platform)}</span>;
  }

  return (
    <Badge variant={badgeVariant} className={`inline-flex items-center px-1.5 py-0.5 ${className}`}>
      {isApp ? (
        <AppIcon className="h-3 w-auto fill-current" />
      ) : isPs5 ? (
        <PS5Icon className="h-3 w-auto fill-current" />
      ) : isPs4 ? (
        <PS4Icon className="h-3 w-auto fill-current" />
      ) : isPs3 ? (
        <PS3Icon className="h-3 w-auto fill-current" />
      ) : (
        <span>{platformLabel(platform)}</span>
      )}
    </Badge>
  );
}
