import { DatePipe } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { errorMessage } from '../../core/http-error';
import { MarkdownPipe } from '../../core/markdown.pipe';
import { MeetingService } from '../../core/meeting.service';
import { ExportService } from '../../core/export.service';
import { AudioService } from '../../core/audio.service';
import { GeneratedDocument, Meeting, STATUS_LABELS } from '../../core/models';

@Component({
  selector: 'app-meeting-detail',
  imports: [RouterLink, DatePipe, MarkdownPipe],
  templateUrl: './meeting-detail.component.html',
})
export class MeetingDetailComponent implements OnInit, OnDestroy {
  private readonly meetingService = inject(MeetingService);
  private readonly exportService = inject(ExportService);
  private readonly audioService = inject(AudioService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly meeting = signal<Meeting | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly statusLabels = STATUS_LABELS;

  // --- Génération de documents ---
  readonly documentTypes = [
    { type: 'compte rendu', label: 'Compte rendu' },
    { type: 'lettre', label: 'Lettre' },
    { type: 'rapport', label: 'Rapport' },
    { type: 'tableau', label: 'Tableau' },
  ];
  readonly generating = signal<string | null>(null);
  readonly generationError = signal<string | null>(null);
  readonly documents = signal<GeneratedDocument[]>([]);
  readonly selected = signal<GeneratedDocument | null>(null);
  readonly copied = signal(false);
  readonly exporting = signal<number | null>(null);

  // --- Enregistrement audio ---
  readonly recording = signal(false);
  readonly transcribing = signal(false);
  readonly transcriptError = signal<string | null>(null);
  readonly elapsedMs = signal(0);
  private timer?: ReturnType<typeof setInterval>;
  private recordingStartedAt = 0;

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.meetingService.get(id).subscribe({
      next: (meeting) => {
        this.meeting.set(meeting);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(errorMessage(err));
        this.loading.set(false);
      },
    });
    this.meetingService.listDocuments(id).subscribe({
      next: (docs) => this.documents.set(docs),
      error: () => this.documents.set([]),
    });
  }

  ngOnDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  labelOf(type: string): string {
    return this.documentTypes.find((d) => d.type === type)?.label ?? type;
  }

  formattedDuration(): string {
    const totalSeconds = Math.floor(this.elapsedMs() / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  // ---------- documents ----------

  generate(type: string, label: string): void {
    const meeting = this.meeting();
    if (!meeting || this.generating()) {
      return;
    }
    this.generating.set(label);
    this.generationError.set(null);
    this.copied.set(false);

    this.meetingService.generateDocument(meeting.id, type).subscribe({
      next: (doc) => {
        this.documents.update((list) => [doc, ...list]);
        this.selected.set(doc);
        this.generating.set(null);
      },
      error: (err) => {
        this.generationError.set(errorMessage(err));
        this.generating.set(null);
      },
    });
  }

  show(doc: GeneratedDocument): void {
    this.selected.set(doc);
    this.copied.set(false);
  }

  async download(doc: GeneratedDocument): Promise<void> {
    const meeting = this.meeting();
    if (!meeting || this.exporting()) {
      return;
    }
    this.exporting.set(doc.id);
    this.generationError.set(null);
    try {
      await this.exportService.exportAndShare(meeting, doc);
    } catch (err) {
      this.generationError.set(errorMessage(err));
    } finally {
      this.exporting.set(null);
    }
  }

  deleteDocument(doc: GeneratedDocument): void {
    const meeting = this.meeting();
    if (!meeting || !confirm(`Supprimer ce document (${this.labelOf(doc.type)}) ?`)) {
      return;
    }
    this.meetingService.deleteDocument(meeting.id, doc.id).subscribe({
      next: () => {
        this.documents.update((list) => list.filter((d) => d.id !== doc.id));
        if (this.selected()?.id === doc.id) {
          this.selected.set(null);
        }
      },
      error: (err) => this.generationError.set(errorMessage(err)),
    });
  }

  async copy(): Promise<void> {
    const doc = this.selected();
    if (!doc) {
      return;
    }
    await navigator.clipboard.writeText(doc.content);
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 2000);
  }

  delete(): void {
    const meeting = this.meeting();
    if (
      !meeting ||
      !confirm(`Supprimer la réunion « ${meeting.theme} » ? Cette action est définitive.`)
    ) {
      return;
    }
    this.meetingService.delete(meeting.id).subscribe({
      next: () => this.router.navigateByUrl('/meetings'),
      error: (err) => this.error.set(errorMessage(err)),
    });
  }

  // ---------- audio ----------

  async startRecording(): Promise<void> {
    this.transcriptError.set(null);
    try {
      await this.audioService.start();
      this.recording.set(true);
      this.recordingStartedAt = Date.now();
      this.elapsedMs.set(0);
      this.timer = setInterval(() => this.elapsedMs.set(Date.now() - this.recordingStartedAt), 1000);
    } catch (err) {
      this.transcriptError.set(errorMessage(err));
    }
  }

  async stopRecording(): Promise<void> {
    const meeting = this.meeting();
    if (!meeting) {
      return;
    }
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
    this.recording.set(false);
    this.transcribing.set(true);
    this.transcriptError.set(null);

    try {
      const audio = await this.audioService.stop();
      this.meetingService.transcribeAudio(meeting.id, audio.base64, audio.mimeType).subscribe({
        next: (updated) => {
          this.meeting.set(updated);
          this.transcribing.set(false);
        },
        error: (err) => {
          this.transcriptError.set(errorMessage(err));
          this.transcribing.set(false);
        },
      });
    } catch (err) {
      this.transcriptError.set(errorMessage(err));
      this.transcribing.set(false);
    }
  }

  async cancelRecording(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
    this.recording.set(false);
    await this.audioService.cancel();
  }
}
