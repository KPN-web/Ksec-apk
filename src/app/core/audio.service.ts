import { Injectable } from "@angular/core";
import { VoiceRecorder } from "capacitor-voice-recorder";

export interface RecordedAudio {
  base64: string;
  mimeType: string;
  durationMs: number;
}

/** Retire un éventuel préfixe data:...;base64, et tout caractère hors alphabet Base64. */
function sanitizeBase64(raw: string): string {
  const withoutPrefix = raw.includes(",") && raw.trim().startsWith("data:")
    ? raw.slice(raw.indexOf(",") + 1)
    : raw;
  return withoutPrefix.replace(/[^A-Za-z0-9+/=]/g, "");
}

@Injectable({ providedIn: "root" })
export class AudioService {
  private recording = false;

  async requestPermission(): Promise<boolean> {
    const result = await VoiceRecorder.requestAudioRecordingPermission();
    return result.value;
  }

  async hasPermission(): Promise<boolean> {
    const result = await VoiceRecorder.hasAudioRecordingPermission();
    return result.value;
  }

  async start(): Promise<void> {
    if (this.recording) {
      return;
    }
    const hasPermission = await this.hasPermission();
    if (!hasPermission) {
      const granted = await this.requestPermission();
      if (!granted) {
        throw new Error("Permission microphone refusée. Autorisez l'accès au micro dans les réglages du téléphone.");
      }
    }
    await VoiceRecorder.startRecording();
    this.recording = true;
  }

  async stop(): Promise<RecordedAudio> {
    if (!this.recording) {
      throw new Error("Aucun enregistrement en cours.");
    }
    const result = await VoiceRecorder.stopRecording();
    this.recording = false;

    const raw = result.value.recordDataBase64;
    if (!raw) {
      throw new Error("L'enregistrement a échoué : aucune donnée audio reçue.");
    }
    const base64 = sanitizeBase64(raw);
    if (base64.length < 100) {
      throw new Error("L'enregistrement semble vide ou trop court. Réessayez en parlant plus longtemps.");
    }
    const mimeType = result.value.mimeType || "audio/aac";
    const durationMs = result.value.msDuration ?? 0;

    // Vérifie la taille avant d'envoyer à Gemini (limite pratique ~15 Mo en base64).
    const approxBytes = (base64.length * 3) / 4;
    if (approxBytes > 15 * 1024 * 1024) {
      throw new Error(
        "Enregistrement trop long (limite ~15 minutes). Raccourcissez-le ou enregistrez en plusieurs parties."
      );
    }

    return { base64, mimeType, durationMs };
  }

  async cancel(): Promise<void> {
    if (this.recording) {
      try {
        await VoiceRecorder.stopRecording();
      } finally {
        this.recording = false;
      }
    }
  }

  isRecording(): boolean {
    return this.recording;
  }
}
