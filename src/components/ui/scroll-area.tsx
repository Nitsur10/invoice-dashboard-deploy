import * as React from "react"

interface ScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function ScrollArea({ children, className, ...props }: ScrollAreaProps) {
  return (
    <div
      className={className}
      style={{ overflowY: 'auto', ...props.style }}
      {...props}
    >
      {children}
    </div>
  );
}

