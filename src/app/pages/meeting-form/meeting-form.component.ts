import { Component, OnInit, inject, signal } from "@angular/core";
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { errorMessage } from "../../core/http-error";
import { MeetingService } from "../../core/meeting.service";
import { AgendaItem, Meeting, MeetingRequest, Participant } from "../../core/models";

function agendaGroup(fb: NonNullableFormBuilder, item?: AgendaItem) {
  return fb.group({
    title: [item?.title ?? "", Validators.required],
    description: [item?.description ?? ""],
  });
}

function participantGroup(fb: NonNullableFormBuilder, participant?: Participant) {
  return fb.group({
    name: [participant?.name ?? "", Validators.required],
    jobTitle: [participant?.jobTitle ?? ""],
    present: [participant?.present ?? true],
  });
}

@Component({
  selector: "app-meeting-form",
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: "./meeting-form.component.html",
})
export class MeetingFormComponent implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly meetingService = inject(MeetingService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly meetingId = signal<number | null>(null);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.group({
    theme: ["", [Validators.required, Validators.maxLength(255)]],
    meetingDate: ["", Validators.required],
    location: [""],
    notes: [""],
    agendaItems: this.fb.array([agendaGroup(this.fb)]),
    participants: this.fb.array<ReturnType<typeof participantGroup>>([]),
  });

  get agendaItems() {
    return this.form.controls.agendaItems;
  }

  get participants() {
    return this.form.controls.participants;
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get("id");
    if (id) {
      this.meetingId.set(Number(id));
      this.loadMeeting(Number(id));
    }
  }

  addAgendaItem(): void {
    this.agendaItems.push(agendaGroup(this.fb));
  }

  removeAgendaItem(index: number): void {
    this.agendaItems.removeAt(index);
  }

  addParticipant(): void {
    this.participants.push(participantGroup(this.fb));
  }

  removeParticipant(index: number): void {
    this.participants.removeAt(index);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set("Veuillez corriger les champs signalés en rouge.");
      return;
    }
    this.saving.set(true);
    this.error.set(null);

    const value = this.form.getRawValue();
    const request: MeetingRequest = {
      theme: value.theme.trim(),
      meetingDate: value.meetingDate,
      location: value.location.trim() || null,
      notes: value.notes.trim() || null,
      agendaItems: value.agendaItems.map((a) => ({
        title: a.title.trim(),
        description: a.description.trim() || null,
      })),
      participants: value.participants.map((p) => ({
        name: p.name.trim(),
        jobTitle: p.jobTitle.trim() || null,
        present: p.present,
      })),
    };

    const id = this.meetingId();
    const call = id ? this.meetingService.update(id, request) : this.meetingService.create(request);

    call.subscribe({
      next: (meeting) => this.router.navigate(["/meetings", meeting.id]),
      error: (err) => {
        this.error.set(errorMessage(err));
        this.saving.set(false);
      },
    });
  }

  private loadMeeting(id: number): void {
    this.loading.set(true);
    this.meetingService.get(id).subscribe({
      next: (meeting) => {
        this.fillForm(meeting);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(errorMessage(err));
        this.loading.set(false);
      },
    });
  }

  private fillForm(meeting: Meeting): void {
    this.form.patchValue({
      theme: meeting.theme,
      meetingDate: meeting.meetingDate.slice(0, 16),
      location: meeting.location ?? "",
      notes: meeting.notes ?? "",
    });

    this.agendaItems.clear();
    meeting.agendaItems.forEach((item) => this.agendaItems.push(agendaGroup(this.fb, item)));
    if (this.agendaItems.length === 0) {
      this.addAgendaItem();
    }

    this.participants.clear();
    meeting.participants.forEach((p) => this.participants.push(participantGroup(this.fb, p)));
  }
}
