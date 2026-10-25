import { DatePipe } from "@angular/common";
import { Component, OnInit, inject, signal } from "@angular/core";
import { RouterLink } from "@angular/router";
import { errorMessage } from "../../core/http-error";
import { MeetingService } from "../../core/meeting.service";
import { Meeting, STATUS_LABELS } from "../../core/models";

@Component({
  selector: "app-meetings",
  imports: [RouterLink, DatePipe],
  templateUrl: "./meetings.component.html",
})
export class MeetingsComponent implements OnInit {
  private readonly meetingService = inject(MeetingService);

  readonly meetings = signal<Meeting[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly statusLabels = STATUS_LABELS;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.meetingService.list().subscribe({
      next: (meetings) => {
        this.meetings.set(meetings);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(errorMessage(err));
        this.loading.set(false);
      },
    });
  }
}
