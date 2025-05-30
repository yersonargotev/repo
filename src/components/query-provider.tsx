"use client";

import {
  QueryClient,
  QueryClientProvider,
  isServer
} from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import React from 'react';

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Con SSR, queremos un staleTime por encima de 0 para evitar refetching inmediato en el cliente
        staleTime: 60 * 1000, // 1 minuto
        gcTime: 1000 * 60 * 60 * 24, // 24 horas
        refetchOnWindowFocus: false, // Desactivar refetch en focus para mejor UX
        retry: (failureCount, error) => {
          // No reintentar en errores 4xx
          if (error && typeof error === 'object' && 'status' in error) {
            const status = error.status as number;
            if (status >= 400 && status < 500) return false;
          }
          return failureCount < 3;
        },
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

function getQueryClient() {
  if (isServer) {
    // Servidor: siempre crear un nuevo query client
    return makeQueryClient();
  } else {
    // Navegador: crear un nuevo query client si no tenemos uno ya
    // Esto es muy importante para no recrear el cliente si React 
    // suspende durante el renderizado inicial
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
  }
}

export default function QueryProvider({ children }: { children: React.ReactNode }) {
  // NOTA: Evitar useState al inicializar el query client si no
  // tienes un suspense boundary entre esto y el código que puede
  // suspender porque React va a descartar el cliente en el
  // renderizado inicial si suspende y no hay boundary
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}