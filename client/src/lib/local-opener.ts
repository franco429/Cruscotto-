// Lightweight client helper to request opening a local document via a local companion service.
// Security note: Browsers cannot open arbitrary local file paths directly. This helper
// contacts a local service (if running) on 127.0.0.1 which performs the OS-level open.

import type { DocumentDocument as Document } from "../../../shared-types/schema";

type OpenResult = { ok: boolean; message?: string };

function buildCandidateNames(doc: Document): string[] {
  const base = doc.title || "";
  const rev = doc.revision || "";
  const ext = (doc.fileType || "").replace(/^\./, "");
  const candidates = new Set<string>();
  if (base && rev && ext) {
    candidates.add(`${base} ${rev}.${ext}`);
  }
  if (base && ext) {
    candidates.add(`${base}.${ext}`);
  }
  if (base && rev) {
    candidates.add(`${base} ${rev}`);
  }
  if (base) {
    candidates.add(base);
  }
  return Array.from(candidates);
}

export async function openLocalDocument(doc: Document, abortMs = 1500): Promise<OpenResult> {
  // Skip if clearly a Drive-only document
  if (doc.driveUrl) {
    return { ok: false, message: "Documento remoto (Drive)" };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), abortMs);

  try {
    const res = await fetch("http://127.0.0.1:17654/open", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: doc.title,
        revision: doc.revision,
        fileType: doc.fileType,
        logicalPath: doc.path, // ISO logical path, may help the local service search
        candidates: buildCandidateNames(doc),
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, message: text || `Servizio locale non disponibile (${res.status})` };
    }

    const data = (await res.json().catch(() => null)) as { success?: boolean; message?: string } | null;
    if (data && data.success) {
      return { ok: true };
    }
    return { ok: false, message: data?.message || "Impossibile aprire il file localmente" };
  } catch (err: any) {
    clearTimeout(timer);
    if (err?.name === "AbortError") {
      return { ok: false, message: "Timeout contattando il servizio locale" };
    }
    return { ok: false, message: err?.message || "Errore contattando il servizio locale" };
  }
}




