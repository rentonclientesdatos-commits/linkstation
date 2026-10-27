import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-[#00e5ff]/50",
  {
    variants: {
      variant: {
        default:
          "bg-[#00e5ff] text-[#000d14] font-bold hover:bg-[#38bdf8] shadow-[0_0_15px_rgba(0,229,255,0.35)] hover:shadow-[0_0_24px_rgba(0,229,255,0.6)] active:scale-[0.98]",
        destructive:
          "bg-[rgba(255,45,85,0.15)] text-[#ff2d55] border border-[rgba(255,45,85,0.3)] hover:bg-[#ff2d55] hover:text-white hover:shadow-[0_0_15px_rgba(255,45,85,0.4)] active:scale-[0.98]",
        outline:
          "border border-[rgba(0,229,255,0.2)] bg-[rgba(10,15,30,0.5)] text-slate-200 hover:border-[#00e5ff] hover:text-[#00e5ff] hover:shadow-[0_0_12px_rgba(0,229,255,0.2)] active:scale-[0.98]",
        secondary:
          "bg-[rgba(255,255,255,0.05)] text-slate-200 border border-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.1)] hover:text-white active:scale-[0.98]",
        ghost:
          "text-slate-400 hover:text-slate-100 hover:bg-white/[0.05]",
        link:
          "text-[#00e5ff] underline-offset-4 hover:underline",
        neon:
          "bg-gradient-to-r from-[#00e5ff] to-[#8b5cf6] text-[#000d14] font-bold shadow-[0_0_20px_rgba(0,229,255,0.4)] hover:shadow-[0_0_30px_rgba(139,92,246,0.6)] hover:brightness-110 active:scale-[0.98]",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        xs: "h-6 gap-1 rounded-lg px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 rounded-lg gap-1.5 px-3 has-[>svg]:px-2.5 text-xs",
        lg: "h-10 rounded-xl px-6 has-[>svg]:px-4 text-base",
        icon: "size-9 rounded-xl",
        "icon-xs": "size-6 rounded-md [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8 rounded-lg",
        "icon-lg": "size-10 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
