import { cva, type VariantProps } from "class-variance-authority";

/**
 * Card variants for consistent styling across dashboard components
 */
export const cardVariants = cva(
  "glass-card group cursor-pointer relative overflow-hidden transition-all duration-300 ease-out",
  {
    variants: {
      type: {
        primary: [
          "bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200/50",
          "dark:from-blue-950/20 dark:to-indigo-950/20 dark:border-blue-800/30",
          "hover:from-blue-100 hover:to-indigo-100 dark:hover:from-blue-900/30 dark:hover:to-indigo-900/30"
        ],
        success: [
          "bg-gradient-to-r from-emerald-50 to-emerald-100 border-emerald-200/50",
          "dark:from-emerald-950/20 dark:to-emerald-900/20 dark:border-emerald-800/30",
          "hover:from-emerald-100 hover:to-emerald-200 dark:hover:from-emerald-900/30 dark:hover:to-emerald-800/30"
        ],
        warning: [
          "bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200/50",
          "dark:from-amber-950/20 dark:to-orange-950/20 dark:border-amber-800/30",
          "hover:from-amber-100 hover:to-orange-100 dark:hover:from-amber-900/30 dark:hover:to-orange-900/30"
        ],
        danger: [
          "bg-gradient-to-r from-red-50 to-rose-50 border-red-200/50",
          "dark:from-red-950/20 dark:to-rose-950/20 dark:border-red-800/30",
          "hover:from-red-100 hover:to-rose-100 dark:hover:from-red-900/30 dark:hover:to-rose-900/30"
        ],
        neutral: [
          "bg-gradient-to-r from-slate-50 to-gray-50 border-slate-200/50",
          "dark:from-slate-950/20 dark:to-gray-950/20 dark:border-slate-800/30",
          "hover:from-slate-100 hover:to-gray-100 dark:hover:from-slate-900/30 dark:hover:to-gray-900/30"
        ]
      },
      size: {
        sm: "p-3",
        md: "p-4",
        lg: "p-6",
        xl: "p-8"
      },
      hover: {
        scale: "hover:scale-[1.02] hover:-translate-y-1",
        glow: "hover:shadow-lg",
        none: ""
      }
    },
    compoundVariants: [
      {
        type: "primary",
        hover: "glow",
        className: "hover:shadow-blue-500/20"
      },
      {
        type: "success", 
        hover: "glow",
        className: "hover:shadow-emerald-500/20"
      },
      {
        type: "warning",
        hover: "glow", 
        className: "hover:shadow-amber-500/20"
      },
      {
        type: "danger",
        hover: "glow",
        className: "hover:shadow-red-500/20"
      }
    ],
    defaultVariants: {
      type: "neutral",
      size: "md",
      hover: "scale"
    }
  }
);

/**
 * Icon variants for consistent icon styling
 */
export const iconVariants = cva(
  "transition-all duration-300 ease-out",
  {
    variants: {
      type: {
        primary: "text-blue-600 dark:text-blue-400",
        success: "text-emerald-600 dark:text-emerald-400", 
        warning: "text-amber-600 dark:text-amber-400",
        danger: "text-red-600 dark:text-red-400",
        neutral: "text-slate-600 dark:text-slate-400"
      },
      size: {
        xs: "h-3 w-3",
        sm: "h-4 w-4",
        md: "h-5 w-5", 
        lg: "h-6 w-6",
        xl: "h-8 w-8"
      },
      animation: {
        none: "",
        spin: "group-hover:animate-spin",
        bounce: "group-hover:animate-bounce",
        pulse: "group-hover:animate-pulse",
        scale: "group-hover:scale-110",
        rotate: "group-hover:rotate-12"
      },
      container: {
        none: "",
        rounded: "p-2 rounded-lg",
        circle: "p-2 rounded-full"
      }
    },
    compoundVariants: [
      {
        container: ["rounded", "circle"],
        type: "primary",
        className: "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md"
      },
      {
        container: ["rounded", "circle"], 
        type: "success",
        className: "bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-md"
      },
      {
        container: ["rounded", "circle"],
        type: "warning", 
        className: "bg-gradient-to-r from-amber-600 to-amber-700 text-white shadow-md"
      },
      {
        container: ["rounded", "circle"],
        type: "danger",
        className: "bg-gradient-to-r from-red-600 to-red-700 text-white shadow-md"
      }
    ],
    defaultVariants: {
      type: "neutral",
      size: "md", 
      animation: "none",
      container: "none"
    }
  }
);

/**
 * Badge variants for status indicators
 */
export const badgeVariants = cva(
  "inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium transition-all duration-300 ease-out",
  {
    variants: {
      variant: {
        default: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100",
        primary: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
        success: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
        warning: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
        danger: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
        outline: "border border-current bg-transparent"
      },
      size: {
        sm: "px-1.5 py-0.5 text-xs",
        md: "px-2 py-1 text-xs", 
        lg: "px-3 py-1.5 text-sm"
      },
      animation: {
        none: "",
        pulse: "animate-pulse",
        bounce: "animate-bounce", 
        glow: "pulse-glow"
      }
    },
    compoundVariants: [
      {
        variant: "outline",
        animation: "glow",
        className: "hover:bg-current/10"
      }
    ],
    defaultVariants: {
      variant: "default",
      size: "md",
      animation: "none"
    }
  }
);

// Export types for components
export type CardVariants = VariantProps<typeof cardVariants>;
export type IconVariants = VariantProps<typeof iconVariants>;  
export type BadgeVariants = VariantProps<typeof badgeVariants>;