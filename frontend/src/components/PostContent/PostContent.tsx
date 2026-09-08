import { cn } from "@/utils/cn";
import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { MediaLightbox } from "../MediaLightbox/MediaLightbox";

interface PostContentProps {
  content: string;
  className?: string;
  size?: "sm" | "base";
}

export const PostContent: React.FC<PostContentProps> = ({
  content,
  className,
  size = "sm",
}) => {
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  if (!content) return null;

  return (
    <>
      <div
        className={cn(
          "prose prose-invert max-w-none break-words text-gray-300",
          size === "sm"
            ? "text-sm leading-relaxed"
            : "text-base leading-relaxed",
          className,
        )}
      >
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            a: ({ href, children, ...props }) => (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="font-medium text-orange-400 hover:underline"
                {...props}
              >
                {children}
              </a>
            ),
            img: ({ src, alt, ...props }) => {
              if (!src) return null;
              return (
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setLightboxImage(src);
                  }}
                  className="my-3 block cursor-pointer overflow-hidden rounded-lg border border-gray-800 bg-black/30"
                >
                  <img
                    src={src}
                    alt={alt || ""}
                    loading="lazy"
                    className="max-h-[500px] w-auto max-w-full rounded-lg object-contain transition-transform duration-300 hover:scale-[1.01]"
                    {...props}
                  />
                </span>
              );
            },
            p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
            h1: ({ children }) => (
              <h1 className="mt-4 mb-3 text-xl font-bold text-gray-100 first:mt-0">
                {children}
              </h1>
            ),
            h2: ({ children }) => (
              <h2 className="mt-3 mb-2 text-lg font-semibold text-gray-100 first:mt-0">
                {children}
              </h2>
            ),
            h3: ({ children }) => (
              <h3 className="mt-3 mb-2 text-base font-semibold text-gray-200 first:mt-0">
                {children}
              </h3>
            ),
            blockquote: ({ children }) => (
              <blockquote className="my-2 border-l-2 border-orange-500/70 pl-3 text-gray-400 italic">
                {children}
              </blockquote>
            ),
            ul: ({ children }) => (
              <ul className="my-2 list-disc space-y-1 pl-5">{children}</ul>
            ),
            ol: ({ children }) => (
              <ol className="my-2 list-decimal space-y-1 pl-5">{children}</ol>
            ),
            code: ({ className: codeClass, children, ...props }) => {
              const isInline = !codeClass;
              if (isInline) {
                return (
                  <code
                    className="rounded bg-gray-800 px-1.5 py-0.5 font-mono text-xs text-orange-300"
                    {...props}
                  >
                    {children}
                  </code>
                );
              }
              return (
                <code
                  className={cn(
                    "block overflow-x-auto rounded-lg bg-gray-950 p-3 font-mono text-xs text-gray-200",
                    codeClass,
                  )}
                  {...props}
                >
                  {children}
                </code>
              );
            },
            pre: ({ children }) => (
              <pre className="my-3 overflow-x-auto rounded-lg border border-gray-800 bg-gray-950 p-3">
                {children}
              </pre>
            ),
          }}
        >
          {content}
        </ReactMarkdown>
      </div>

      {lightboxImage && (
        <MediaLightbox
          media={[{ url: lightboxImage, type: "image" }]}
          initialIndex={0}
          onClose={() => setLightboxImage(null)}
        />
      )}
    </>
  );
};
