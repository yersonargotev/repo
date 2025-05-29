import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";

export default function HomePage() {
  // Este estado y handler serían para un input donde el usuario pega la URL
  // y luego es redirigido. Por ahora, es un ejemplo simple.
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const url = formData.get("repoUrl") as string;
    if (url) {
      try {
        const parsedUrl = new URL(url);
        if (parsedUrl.hostname === "github.com") {
          const pathParts = parsedUrl.pathname.split('/').filter(Boolean);
          if (pathParts.length >= 2) {
            const owner = pathParts[0];
            const repo = pathParts[1];
            // Redirigir usando Next.js router o un Link
            window.location.href = `/${owner}/${repo}`;
            return;
          }
        }
      } catch (error) {
        console.error("URL inválida:", error);
        // Aquí podrías mostrar un error al usuario
      }
    }
    alert("Por favor, ingresa una URL de GitHub válida.");
  };

  return (
    <div className="container relative min-h-screen flex-col items-center justify-center md:grid lg:max-w-none lg:grid-cols-1 lg:px-0">
      <div className="lg:p-8">
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[450px]">
          <div className="flex flex-col space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">
              GitHub Repository Analyzer
            </h1>
            <p className="text-sm text-muted-foreground">
              Ingresa la URL de un repositorio de GitHub para analizarlo y encontrar alternativas.
            </p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              name="repoUrl"
              type="url"
              placeholder="Ej: https://github.com/microsoft/vscode"
              required
              className="h-12 text-lg"
            />
            <Button type="submit" className="w-full h-12 text-lg">
              Analizar Repositorio
            </Button>
          </form>

          <p className="px-8 text-center text-sm text-muted-foreground">
            O prueba con un ejemplo:
            <Link
              href="/microsoft/vscode"
              className="underline underline-offset-4 hover:text-primary"
            >
              microsoft/vscode
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}