import { Injectable } from "@angular/core";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { Document, Packer, Paragraph, TextRun } from "docx";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";
import { GeneratedDocument, Meeting } from "./models";

const BOLD = /\*\*(.+?)\*\*/g;

@Injectable({ providedIn: "root" })
export class ExportService {
  /** Génère le fichier adapté au type de document, puis ouvre le partage Android. */
  async exportAndShare(meeting: Meeting, doc: GeneratedDocument): Promise<void> {
    const type = doc.type.toLowerCase();
    let base64: string;
    let extension: string;

    if (type === "lettre") {
      base64 = await this.toPdfBase64(doc.content);
      extension = "pdf";
    } else if (type === "tableau") {
      base64 = this.toXlsxBase64(doc.content);
      extension = "xlsx";
    } else {
      base64 = await this.toDocxBase64(doc.content);
      extension = "docx";
    }

    const fileName = `${type.replace(/\s+/g, "-")}-${meeting.id}-${doc.id}.${extension}`;

    const written = await Filesystem.writeFile({
      path: fileName,
      data: base64,
      directory: Directory.Cache,
    });

    await Share.share({ title: fileName, url: written.uri });
  }

  // ---------- Word (compte rendu, rapport) ----------

  private async toDocxBase64(content: string): Promise<string> {
    const children: Paragraph[] = [];

    for (const raw of content.split("\n")) {
      const line = raw.trim();
      if (!line) {
        children.push(new Paragraph({}));
      } else if (line.startsWith("### ")) {
        children.push(this.heading(line.slice(4), 13));
      } else if (line.startsWith("## ")) {
        children.push(this.heading(line.slice(3), 15));
      } else if (line.startsWith("# ")) {
        children.push(this.heading(line.slice(2), 18));
      } else if (line.startsWith("- ") || line.startsWith("* ")) {
        children.push(this.bulletParagraph(line.slice(2)));
      } else if (/^\d+\.\s/.test(line)) {
        children.push(this.bulletParagraph(line.replace(/^\d+\.\s/, "")));
      } else if (line === "---") {
        children.push(
          new Paragraph({ border: { bottom: { color: "999999", space: 1, style: "single", size: 6 } } })
        );
      } else if (line.startsWith("|")) {
        children.push(new Paragraph({ children: [new TextRun({ text: line, font: "Consolas", size: 18 })] }));
      } else {
        children.push(this.textParagraph(line));
      }
    }

    const document = new Document({ sections: [{ children }] });
    const blob = await Packer.toBlob(document);
    return this.blobToBase64(blob);
  }

  private heading(text: string, size: number): Paragraph {
    return new Paragraph({
      spacing: { before: 200, after: 100 },
      children: [new TextRun({ text: this.stripBold(text), bold: true, size: size * 2 })],
    });
  }

  private bulletParagraph(text: string): Paragraph {
    return new Paragraph({
      indent: { left: 400 },
      children: [new TextRun({ text: "• " }), ...this.boldRuns(text)],
    });
  }

  private textParagraph(text: string): Paragraph {
    return new Paragraph({ children: this.boldRuns(text) });
  }

  private boldRuns(text: string): TextRun[] {
    const runs: TextRun[] = [];
    let lastEnd = 0;
    let match: RegExpExecArray | null;
    const re = new RegExp(BOLD);
    while ((match = re.exec(text))) {
      if (match.index > lastEnd) runs.push(new TextRun({ text: text.slice(lastEnd, match.index) }));
      runs.push(new TextRun({ text: match[1], bold: true }));
      lastEnd = match.index + match[0].length;
    }
    if (lastEnd < text.length) runs.push(new TextRun({ text: text.slice(lastEnd) }));
    return runs.length ? runs : [new TextRun({ text })];
  }

  private stripBold(text: string): string {
    return text.replace(BOLD, "$1");
  }

  // ---------- PDF (lettre) ----------

  private async toPdfBase64(content: string): Promise<string> {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const marginLeft = 20;
    const maxWidth = 170;
    const lineHeight = 6;
    let y = 20;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);

    for (const para of content.split(/\n{2,}/)) {
      const cleaned = para.replace(BOLD, "$1").trim();
      if (!cleaned) continue;
      for (const line of doc.splitTextToSize(cleaned, maxWidth)) {
        if (y > 280) {
          doc.addPage();
          y = 20;
        }
        doc.text(line, marginLeft, y);
        y += lineHeight;
      }
      y += lineHeight;
    }

    return doc.output("datauristring").split(",")[1];
  }

  // ---------- Excel (tableau) ----------

  private toXlsxBase64(content: string): string {
    const rows = content
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.startsWith("|"))
      .filter((l) => !/^\|[\s:-]+\|$/.test(l))
      .map((l) =>
        l
          .split("|")
          .slice(1, -1)
          .map((c) => c.trim().replace(BOLD, "$1"))
      );

    const data = rows.length ? rows : [["Aucune donnée"]];
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tableau");
    return XLSX.write(wb, { type: "base64", bookType: "xlsx" });
  }

  // ---------- utilitaire ----------

  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string).split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}
