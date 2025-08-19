"use client";

import Image from "next/image";

type CardItemProps = {
  imageSrc: string;
  imageAlt?: string;
  description: string;
  content: { title?: string; body?: string } | string;
  onSelect?: (content: { title?: string; body?: string } | string) => void;
};

export default function CardItem({
  imageSrc,
  imageAlt = "item image",
  description,
  content,
  onSelect,
}: CardItemProps) {
  return (
    <div
      onClick={() => onSelect?.(content)}
      className="group relative bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer overflow-hidden hover:border-gray-300"
    >
      {/* Subtle overlay for visual appeal */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/10 to-purple-50/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <div className="relative p-3">
        <div className="flex items-start gap-3">
          {/* Image container - compact size */}
          <div className="relative flex-shrink-0 w-16 h-16 bg-gray-100 rounded-md overflow-hidden">
            <Image
              src={imageSrc}
              alt={imageAlt}
              fill
              sizes="64px"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          </div>

          {/* Content section */}
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-600 leading-snug line-clamp-4 group-hover:text-gray-800 transition-colors duration-200">
              {description}
            </p>
          </div>

          {/* Arrow indicator - smaller */}
          <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-1 group-hover:translate-x-0">
            <svg
              className="w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}