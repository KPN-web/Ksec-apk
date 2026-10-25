import { Injectable, inject } from '@angular/core';
import { SettingsService } from './settings.service';
import { Meeting } from './models';

const INSTRUCTIONS: Record<string, string> = {
  'compte rendu':
    "Rédige un compte rendu structuré par point à l'ordre du jour. Pour chaque point : résumé, décisions prises, actions à suivre avec responsable si connu. Utilise des titres et des puces.",
  lettre:
    "Rédige une lettre formelle : formule d'appel, corps en paragraphes, formule de politesse et signature. N'utilise ni titres ni puces.",
  rapport:
    "Rédige un rapport : introduction, sections numérotées analysant chaque point à l'ordre du jour, recommandations, puis conclusion.",
  tableau:
    'Produis uniquement un tableau Markdown récapitulatif avec les colonnes : Point, Résumé / décision, Responsable, Statut. Aucun texte avant ni après le tableau.',
};

const TRANSCRIPTION_PROMPT =
  "Transcris fidèlement cet enregistrement audio d'une réunion, en français. " +
  'Ne résume pas, ne commente pas : donne uniquement le texte transcrit, avec la ponctuation. ' +
  "Si plusieurs personnes parlent, indique les changements de locuteur par 'Intervenant : '.";

@Injectable({ providedIn: 'root' })
export class GeminiService {
  private readonly settings = inject(SettingsService);

  async generate(meeting: Meeting, type: string): Promise<string> {
    const apiKey = await this.settings.getApiKey();
    if (!apiKey) {
      throw new Error('Clé Gemini manquante : renseignez-la dans Paramètres.');
    }
    const model = await this.settings.getModel();
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: this.buildPrompt(meeting, type) }] }],
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(`Gemini (${res.status}) : ${data?.error?.message ?? 'erreur inconnue'}`);
    }
    const text = (data?.candidates?.[0]?.content?.parts ?? [])
      .map((p: any) => p.text ?? '')
      .join('')
      .trim();
    if (!text) {
      throw new Error("Gemini n'a renvoyé aucun texte.");
    }
    return text;
  }

  /** Envoie l'audio enregistré à Gemini et renvoie le texte transcrit. */
  async transcribeAudio(base64: string, mimeType: string): Promise<string> {
    const apiKey = await this.settings.getApiKey();
    if (!apiKey) {
      throw new Error('Clé Gemini manquante : renseignez-la dans Paramètres.');
    }
    const model = await this.settings.getModel();
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: TRANSCRIPTION_PROMPT }, { inlineData: { mimeType, data: base64 } }],
          },
        ],
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(`Gemini (${res.status}) : ${data?.error?.message ?? 'erreur inconnue'}`);
    }
    const text = (data?.candidates?.[0]?.content?.parts ?? [])
      .map((p: any) => p.text ?? '')
      .join('')
      .trim();
    if (!text) {
      throw new Error("Gemini n'a renvoyé aucune transcription.");
    }
    return text;
  }

  private buildPrompt(meeting: Meeting, type: string): string {
    const lines: string[] = [];
    lines.push(
      `Tu es une secrétaire professionnelle. Rédige un ${type} pour la réunion suivante.`,
      '',
    );
    lines.push(`Thème : ${meeting.theme}`);
    lines.push(`Date : ${meeting.meetingDate}`);
    if (meeting.location) lines.push(`Lieu : ${meeting.location}`);

    if (meeting.participants.length > 0) {
      lines.push('', 'Participants :');
      for (const p of meeting.participants) {
        const job = p.jobTitle ? ` (${p.jobTitle})` : '';
        lines.push(`- ${p.name}${job} - ${p.present ? 'présent' : 'absent'}`);
      }
    }

    lines.push('', "Points à l'ordre du jour :");
    for (const item of meeting.agendaItems) {
      lines.push(`- ${item.title}${item.description ? ' : ' + item.description : ''}`);
    }

    if (meeting.notes) lines.push('', 'Notes complémentaires :', meeting.notes);
    if (meeting.transcript) {
      lines.push('', "Transcription de l'enregistrement audio de la réunion :", meeting.transcript);
    }

    lines.push('', INSTRUCTIONS[type.toLowerCase()] ?? '');
    lines.push('Rédige uniquement le contenu du document, sans commentaire additionnel.');
    return lines.join('\n');
  }
}
