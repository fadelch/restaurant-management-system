"use client";

import { useEffect, useRef, useState } from "react";

type AnimationVariant =
  | "fade-up"
  | "fade-down"
  | "fade-left"
  | "fade-right"
  | "zoom";

interface AnimatedSectionProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  once?: boolean;
  variant?: AnimationVariant;
}

export default function AnimatedSection({
  children,
  className = "",
  delay = 0,
  duration = 800,
  once = true,
  variant = "fade-up",
}: AnimatedSectionProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const current = ref.current;
    if (!current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShow(true);

          if (once) {
            observer.unobserve(current);
          }
        } else if (!once) {
          setShow(false);
        }
      },
      {
        threshold: 0.18,
        rootMargin: "0px 0px -60px 0px",
      },
    );

    observer.observe(current);

    return () => observer.disconnect();
  }, [once]);

  const hiddenVariants: Record<AnimationVariant, string> = {
    "fade-up": "opacity-0 translate-y-12 scale-[0.98]",
    "fade-down": "opacity-0 -translate-y-12 scale-[0.98]",
    "fade-left": "opacity-0 translate-x-12 scale-[0.98]",
    "fade-right": "opacity-0 -translate-x-12 scale-[0.98]",
    zoom: "opacity-0 scale-95",
  };

  return (
    <section
      ref={ref}
      style={{
        transitionDelay: `${delay}ms`,
        transitionDuration: `${duration}ms`,
      }}
      className={`
        transform-gpu will-change-transform
        transition-[opacity,transform,filter]
        ease-[cubic-bezier(0.22,1,0.36,1)]
        ${
          show
            ? "opacity-100 translate-x-0 translate-y-0 scale-100 blur-0"
            : `${hiddenVariants[variant]} blur-[2px]`
        }
        ${className}
      `}
    >
      {children}
    </section>
  );
}
