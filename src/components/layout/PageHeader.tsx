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
        "bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600 rounded-2xl p-6 md:px-8 mb-8 text-white shadow-md border-2 border-indigo-400/30 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4", 
        className
      )} 
      {...props}
    >
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">{title}</h1>
        {description && (
          typeof description === "string" ? (
            <p className="text-white/80 mt-1">{description}</p>
          ) : (
            <div className="mt-1">{description}</div>
          )
        )}
      </div>
      {action && (
        <div className="flex-shrink-0 w-full sm:w-auto flex flex-col sm:flex-row gap-2">
          {action}
        </div>
      )}
    </div>
  );
}
