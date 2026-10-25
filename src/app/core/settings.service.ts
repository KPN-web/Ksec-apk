import { Injectable } from "@angular/core";
import { Preferences } from "@capacitor/preferences";

const KEY_API = "gemini.apiKey";
const KEY_MODEL = "gemini.model";
export const DEFAULT_MODEL = "gemini-2.5-flash";

@Injectable({ providedIn: "root" })
export class SettingsService {
  async getApiKey(): Promise<string> {
    return (await Preferences.get({ key: KEY_API })).value ?? "";
  }

  async getModel(): Promise<string> {
    return (await Preferences.get({ key: KEY_MODEL })).value || DEFAULT_MODEL;
  }

  async save(apiKey: string, model: string): Promise<void> {
    await Preferences.set({ key: KEY_API, value: apiKey.trim() });
    await Preferences.set({ key: KEY_MODEL, value: model.trim() || DEFAULT_MODEL });
  }
}
