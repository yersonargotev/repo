import { ThemeToggle } from "@/components/theme-toggle";
import { Github } from "lucide-react";
import Link from "next/link";
import { Button } from "./ui/button";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        <Link href="/" className="mr-6 flex items-center space-x-2">
          {/* Podrías poner un logo SVG aquí */}
          <span className="font-bold sm:inline-block">
            RepoAnalyzer
          </span>
        </Link>
        <nav className="flex flex-1 items-center space-x-6 text-sm font-medium">
          {/* Aquí podrían ir más links de navegación si es necesario */}
        </nav>
        <div className="flex flex-1 items-center justify-end space-x-2">
          <Button variant="ghost" size="icon" asChild>
            <Link href="https://github.com/yersonargotev/github-repo-analyzer" target="_blank" rel="noopener noreferrer"> {/* Reemplaza con tu repo */}
              <Github className="h-5 w-5" />
              <span className="sr-only">GitHub</span>
            </Link>
          </Button>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
