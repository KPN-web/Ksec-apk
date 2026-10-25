import { Component, inject, signal } from "@angular/core";
import { RouterLink } from "@angular/router";
import { SettingsService } from "../../core/settings.service";

@Component({
  selector: "app-settings",
  imports: [RouterLink],
  templateUrl: "./settings.component.html",
})
export class SettingsComponent {
  private readonly settings = inject(SettingsService);

  protected readonly apiKey = signal("");
  protected readonly model = signal("");
  protected readonly saved = signal(false);

  constructor() {
    this.load();
  }

  private async load() {
    this.apiKey.set(await this.settings.getApiKey());
    this.model.set(await this.settings.getModel());
  }

  protected async save() {
    await this.settings.save(this.apiKey(), this.model());
    this.saved.set(true);
    setTimeout(() => this.saved.set(false), 2500);
  }
}
