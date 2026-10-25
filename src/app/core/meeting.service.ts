import { Injectable, inject } from '@angular/core';
import { Observable, from, throwError } from 'rxjs';
import { DbService } from './db.service';
import { GeminiService } from './gemini.service';
import {
  AgendaItem,
  GeneratedDocument,
  Meeting,
  MeetingRequest,
  MeetingStatus,
  Participant,
} from './models';

@Injectable({ providedIn: 'root' })
export class MeetingService {
  private readonly dbService = inject(DbService);
  private readonly gemini = inject(GeminiService);
  private transcriptColumnEnsured = false;

  list(): Observable<Meeting[]> {
    return from(this.listAsync());
  }

  get(id: number): Observable<Meeting> {
    return from(this.getAsync(id));
  }

  create(request: MeetingRequest): Observable<Meeting> {
    return from(this.createAsync(request));
  }

  update(id: number, request: MeetingRequest): Observable<Meeting> {
    return from(this.updateAsync(id, request));
  }

  delete(id: number): Observable<void> {
    return from(this.deleteAsync(id));
  }

  listDocuments(id: number): Observable<GeneratedDocument[]> {
    return from(this.listDocumentsAsync(id));
  }

  deleteDocument(meetingId: number, documentId: number): Observable<void> {
    return from(this.deleteDocumentAsync(documentId));
  }

  generateDocument(id: number, type: string): Observable<GeneratedDocument> {
    return from(this.generateAsync(id, type));
  }

  /** Envoie l'audio à Gemini, enregistre la transcription sur la réunion, renvoie la réunion à jour. */
  transcribeAudio(meetingId: number, base64: string, mimeType: string): Observable<Meeting> {
    return from(this.transcribeAsync(meetingId, base64, mimeType));
  }

  // À brancher à l'étape suivante (export)
  downloadDocx(meetingId: number, documentId: number): Observable<Blob> {
    return throwError(() => new Error('Export pas encore branché'));
  }

  // ---------- réunions ----------

  private async listAsync(): Promise<Meeting[]> {
    const db = await this.dbService.connection();
    const res = await db.query('SELECT * FROM meetings ORDER BY meeting_date DESC, id DESC');
    const meetings: Meeting[] = [];
    for (const row of res.values ?? []) {
      meetings.push(await this.hydrate(row));
    }
    return meetings;
  }

  private async getAsync(id: number): Promise<Meeting> {
    const db = await this.dbService.connection();
    const res = await db.query('SELECT * FROM meetings WHERE id = ?', [id]);
    const row = res.values?.[0];
    if (!row) {
      throw new Error('Réunion introuvable');
    }
    return this.hydrate(row);
  }

  private async createAsync(request: MeetingRequest): Promise<Meeting> {
    const db = await this.dbService.connection();
    const res = await db.run(
      "INSERT INTO meetings (theme, meeting_date, location, notes, status, created_at) VALUES (?, ?, ?, ?, 'DRAFT', ?)",
      [
        request.theme,
        request.meetingDate,
        request.location,
        request.notes,
        new Date().toISOString(),
      ],
    );
    const id = res.changes?.lastId as number;
    await this.saveChildren(id, request);
    await this.dbService.persist();
    return this.getAsync(id);
  }

  private async updateAsync(id: number, request: MeetingRequest): Promise<Meeting> {
    const db = await this.dbService.connection();
    await db.run(
      'UPDATE meetings SET theme = ?, meeting_date = ?, location = ?, notes = ? WHERE id = ?',
      [request.theme, request.meetingDate, request.location, request.notes, id],
    );
    await db.run('DELETE FROM agenda_items WHERE meeting_id = ?', [id]);
    await db.run('DELETE FROM participants WHERE meeting_id = ?', [id]);
    await this.saveChildren(id, request);
    await this.dbService.persist();
    return this.getAsync(id);
  }

  private async deleteAsync(id: number): Promise<void> {
    const db = await this.dbService.connection();
    await db.run('DELETE FROM generated_documents WHERE meeting_id = ?', [id]);
    await db.run('DELETE FROM agenda_items WHERE meeting_id = ?', [id]);
    await db.run('DELETE FROM participants WHERE meeting_id = ?', [id]);
    await db.run('DELETE FROM meetings WHERE id = ?', [id]);
    await this.dbService.persist();
  }

  private async saveChildren(meetingId: number, request: MeetingRequest): Promise<void> {
    const db = await this.dbService.connection();
    let position = 0;
    for (const item of request.agendaItems ?? []) {
      await db.run(
        'INSERT INTO agenda_items (meeting_id, position, title, description) VALUES (?, ?, ?, ?)',
        [meetingId, position++, item.title, item.description],
      );
    }
    for (const p of request.participants ?? []) {
      await db.run(
        'INSERT INTO participants (meeting_id, name, job_title, present) VALUES (?, ?, ?, ?)',
        [meetingId, p.name, p.jobTitle, p.present ? 1 : 0],
      );
    }
  }

  private async hydrate(row: any): Promise<Meeting> {
    const db = await this.dbService.connection();
    const agenda = await db.query(
      'SELECT title, description FROM agenda_items WHERE meeting_id = ? ORDER BY position',
      [row.id],
    );
    const parts = await db.query(
      'SELECT name, job_title, present FROM participants WHERE meeting_id = ? ORDER BY id',
      [row.id],
    );
    const agendaItems: AgendaItem[] = (agenda.values ?? []).map((a: any) => ({
      title: a.title,
      description: a.description ?? null,
    }));
    const participants: Participant[] = (parts.values ?? []).map((p: any) => ({
      name: p.name,
      jobTitle: p.job_title ?? null,
      present: p.present === 1,
    }));
    return {
      id: row.id,
      theme: row.theme,
      meetingDate: row.meeting_date,
      location: row.location ?? null,
      notes: row.notes ?? null,
      transcript: row.transcript ?? null,
      status: row.status as MeetingStatus,
      agendaItems,
      participants,
      createdAt: row.created_at,
    };
  }

  // ---------- documents générés ----------

  private async generateAsync(meetingId: number, type: string): Promise<GeneratedDocument> {
    const normalized = type.trim().toLowerCase();
    const meeting = await this.getAsync(meetingId);
    const content = await this.gemini.generate(meeting, normalized);

    const db = await this.dbService.connection();
    const createdAt = new Date().toISOString();
    const res = await db.run(
      'INSERT INTO generated_documents (meeting_id, type, content, created_at) VALUES (?, ?, ?, ?)',
      [meetingId, normalized, content, createdAt],
    );
    await this.dbService.persist();
    return { id: res.changes?.lastId as number, type: normalized, content, createdAt };
  }

  private async listDocumentsAsync(meetingId: number): Promise<GeneratedDocument[]> {
    const db = await this.dbService.connection();
    const res = await db.query(
      'SELECT id, type, content, created_at FROM generated_documents WHERE meeting_id = ? ORDER BY created_at DESC',
      [meetingId],
    );
    return (res.values ?? []).map((d: any) => ({
      id: d.id,
      type: d.type,
      content: d.content,
      createdAt: d.created_at,
    }));
  }

  private async deleteDocumentAsync(documentId: number): Promise<void> {
    const db = await this.dbService.connection();
    await db.run('DELETE FROM generated_documents WHERE id = ?', [documentId]);
    await this.dbService.persist();
  }

  // ---------- transcription audio ----------

  private async transcribeAsync(
    meetingId: number,
    base64: string,
    mimeType: string,
  ): Promise<Meeting> {
    const transcript = await this.gemini.transcribeAudio(base64, mimeType);
    await this.ensureTranscriptColumn();
    const db = await this.dbService.connection();
    await db.run('UPDATE meetings SET transcript = ? WHERE id = ?', [transcript, meetingId]);
    await this.dbService.persist();
    return this.getAsync(meetingId);
  }

  /** Ajoute la colonne transcript à la table meetings si elle n'existe pas encore (migration légère). */
  private async ensureTranscriptColumn(): Promise<void> {
    if (this.transcriptColumnEnsured) {
      return;
    }
    const db = await this.dbService.connection();
    try {
      await db.run('ALTER TABLE meetings ADD COLUMN transcript TEXT');
    } catch {
      // La colonne existe déjà : rien à faire.
    }
    this.transcriptColumnEnsured = true;
  }
}
