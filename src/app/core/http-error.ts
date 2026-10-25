import { HttpErrorResponse } from "@angular/common/http";

export function errorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 0) {
      return "Impossible de joindre le serveur. Vérifiez votre connexion internet.";
    }
    const body = err.error;
    if (body && typeof body === "object") {
      const details = body.errors ? Object.values(body.errors as Record<string, string>) : [];
      if (details.length > 0) {
        return details.join(" · ");
      }
      if (typeof body.message === "string") {
        return body.message;
      }
    }
    if (err.status >= 500) {
      return "Erreur du serveur. Réessayez dans un instant.";
    }
  }
  if (err instanceof TypeError) {
    return "Impossible de joindre Gemini. Vérifiez la connexion internet de l'appareil.";
  }
  if (err instanceof Error && err.message) {
    return err.message;
  }
  return "Une erreur est survenue.";
}
