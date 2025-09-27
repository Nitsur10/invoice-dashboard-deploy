import * as React from "react";

export type InvoiceFilterPopoverProps = {
  children?: React.ReactNode;
  onApply?: () => void;
  onReset?: () => void;
  className?: string;
};

export function InvoiceFilterPopover(props: InvoiceFilterPopoverProps) {
  // Minimal placeholder to unblock build; wire up real UI later.
  return <div data-component="InvoiceFilterPopover">{props.children}</div>;
}

export default InvoiceFilterPopover;