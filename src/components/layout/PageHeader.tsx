import React from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
}

export function PageHeader({ title, description, action, className, ...props }: PageHeaderProps) {
  return (
    <div 
      className={cn(
        "bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600 rounded-2xl p-4 sm:p-6 md:px-8 mb-6 sm:mb-8 text-white shadow-md border-2 border-indigo-400/30 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 min-w-0 w-full overflow-hidden", 
        className
      )} 
      {...props}
    >
      <div className="flex-1 min-w-0 max-w-full">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white whitespace-normal sm:whitespace-nowrap">{title}</h1>
        {description && (
          typeof description === "string" ? (
            <p className="text-white/80 mt-1 text-xs sm:text-sm leading-relaxed">{description}</p>
          ) : (
            <div className="mt-1 text-xs sm:text-sm leading-relaxed">{description}</div>
          )
        )}
      </div>
      {action && (
        <div className="w-full md:w-auto flex items-center justify-start md:justify-end gap-2 flex-wrap shrink-0">
          {action}
        </div>
      )}
    </div>
  );
}
