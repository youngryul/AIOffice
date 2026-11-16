"use client";

import * as React from "react";
import { Dialog } from "radix-ui";
import { XIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** 오른쪽에서 열리는 상세 패널 (shadcn Sheet) */
function Sheet(props: React.ComponentProps<typeof Dialog.Root>) {
  return <Dialog.Root {...props} />;
}

function SheetContent({ className, children, title, ...props }: React.ComponentProps<typeof Dialog.Content> & { title: string }) {
  return (
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-50 bg-[oklch(0.3_0.03_40/0.35)] backdrop-blur-[2px]" />
      <Dialog.Content
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col gap-4 overflow-y-auto rounded-l-3xl border-2 border-r-0 border-border-strong bg-background p-6 shadow-xl outline-none",
          className,
        )}
        {...props}
      >
        <div className="flex items-start justify-between gap-4">
          <Dialog.Title className="font-[family-name:var(--font-cute)] text-xl">{title}</Dialog.Title>
          <Dialog.Close className="rounded-full p-1.5 opacity-70 hover:bg-accent hover:opacity-100" aria-label="닫기">
            <XIcon className="size-4" />
          </Dialog.Close>
        </div>
        <Dialog.Description className="sr-only">{title} 상세 정보</Dialog.Description>
        {children}
      </Dialog.Content>
    </Dialog.Portal>
  );
}

export { Sheet, SheetContent };
