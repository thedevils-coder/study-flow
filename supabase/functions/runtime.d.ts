declare namespace Deno {
  namespace env {
    function get(key: string): string | undefined;
  }

  function serve(
    handler: (request: Request) => Response | Promise<Response>,
  ): void;
}

declare module 'npm:@supabase/supabase-js@2' {
  export * from '@supabase/supabase-js';
}

declare module 'jsr:@supabase/supabase-js@2' {
  export * from '@supabase/supabase-js';
}

declare module 'npm:pdf-lib@1.17.1' {
  export type PDFFont = {
    widthOfTextAtSize(text: string, size: number): number;
    heightAtSize(size: number): number;
  };

  export type PDFPage = {
    drawText(
      text: string,
      options: {
        x: number;
        y: number;
        size: number;
        font: PDFFont;
        color: unknown;
      },
    ): void;
  };

  export class PDFDocument {
    static create(): Promise<PDFDocument>;
    embedFont(font: unknown): Promise<PDFFont>;
    addPage(size: [number, number]): PDFPage;
    save(): Promise<Uint8Array>;
  }

  export const StandardFonts: {
    Helvetica: unknown;
    HelveticaBold: unknown;
  };

  export function rgb(r: number, g: number, b: number): unknown;
}
