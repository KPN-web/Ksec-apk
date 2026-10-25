import { bootstrapApplication } from '@angular/platform-browser';
import { Capacitor } from '@capacitor/core';
import { defineCustomElements as jeepSqlite } from 'jeep-sqlite/loader';
import { appConfig } from './app/app.config';
import { App } from './app/app';

async function start() {
  // Sur navigateur uniquement : active le moteur SQLite web (sur téléphone, SQLite est natif)
  if (Capacitor.getPlatform() === 'web') {
    jeepSqlite(window);
    const jeep = document.createElement('jeep-sqlite');
    document.body.appendChild(jeep);
    await customElements.whenDefined('jeep-sqlite');
  }
  await bootstrapApplication(App, appConfig);
}

start().catch((err) => console.error(err));
