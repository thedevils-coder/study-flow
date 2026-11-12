declare const Deno: {
  env: { get(key: string): string | undefined };
  serve(handler: (req: Request) => Response | Promise<Response>): void;
};

declare module 'npm:@supabase/supabase-js@2' {
  export * from '@supabase/supabase-js';
}

declare module 'npm:pdf-lib@1.17.1';
