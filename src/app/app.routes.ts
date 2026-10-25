import { Routes } from "@angular/router";

export const routes: Routes = [
  { path: "", pathMatch: "full", redirectTo: "meetings" },
  {
    path: "meetings",
    loadComponent: () => import("./pages/meetings/meetings.component").then((m) => m.MeetingsComponent),
  },
  {
    path: "meetings/new",
    loadComponent: () =>
      import("./pages/meeting-form/meeting-form.component").then((m) => m.MeetingFormComponent),
  },
  {
    path: "meetings/:id/edit",
    loadComponent: () =>
      import("./pages/meeting-form/meeting-form.component").then((m) => m.MeetingFormComponent),
  },
  {
    path: "meetings/:id",
    loadComponent: () =>
      import("./pages/meeting-detail/meeting-detail.component").then((m) => m.MeetingDetailComponent),
  },
  {
    path: "settings",
    loadComponent: () => import("./pages/settings/settings.component").then((m) => m.SettingsComponent),
  },
  {
    path: "legal",
    loadComponent: () => import("./pages/legal/legal.component").then((m) => m.LegalComponent),
  },
  {
    path: "privacy",
    loadComponent: () => import("./pages/privacy/privacy.component").then((m) => m.PrivacyComponent),
  },
  { path: "**", redirectTo: "meetings" },
];
