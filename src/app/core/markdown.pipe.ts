import { Pipe, PipeTransform, inject } from "@angular/core";
import { DomSanitizer, SafeHtml } from "@angular/platform-browser";
import { marked } from "marked";

@Pipe({ name: "markdown", standalone: true })
export class MarkdownPipe implements PipeTransform {
  private readonly sanitizer = inject(DomSanitizer);

  transform(value: string | null | undefined): SafeHtml {
    if (!value) {
      return "";
    }
    const html = marked.parse(value, { async: false }) as string;
    // Le contenu provient de nos propres réunions (compte utilisateur connecté),
    // pas d'une source externe non fiable.
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }
}
