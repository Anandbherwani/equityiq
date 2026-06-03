"use client";

import { Download, FileJson, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportAsJson, exportAsText, printPage } from "@/lib/export-utils";

export function ExportMenu({
  text,
  json,
  filenameBase,
}: {
  text: string;
  json: unknown;
  filenameBase: string;
}) {
  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1.5"
        onClick={() => exportAsText(text, `${filenameBase}.txt`)}
      >
        <Download className="h-3.5 w-3.5" />
        Export text
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1.5"
        onClick={() => exportAsJson(json, `${filenameBase}.json`)}
      >
        <FileJson className="h-3.5 w-3.5" />
        Export JSON
      </Button>
      <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={printPage}>
        <Printer className="h-3.5 w-3.5" />
        Print
      </Button>
    </div>
  );
}
