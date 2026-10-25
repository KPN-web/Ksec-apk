import { Injectable } from "@angular/core";
import { Capacitor } from "@capacitor/core";
import {
  CapacitorSQLite,
  SQLiteConnection,
  SQLiteDBConnection,
} from "@capacitor-community/sqlite";

const DB_NAME = "ksec";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS meetings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  theme TEXT NOT NULL,
  meeting_date TEXT NOT NULL,
  location TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS agenda_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  meeting_id INTEGER NOT NULL,
  position INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT
);
CREATE TABLE IF NOT EXISTS participants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  meeting_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  job_title TEXT,
  present INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS generated_documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  meeting_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL
);
`;

@Injectable({ providedIn: "root" })
export class DbService {
  private readonly sqlite = new SQLiteConnection(CapacitorSQLite);
  private ready?: Promise<SQLiteDBConnection>;

  /** Renvoie la connexion à la base, en l'ouvrant à la première utilisation. */
  connection(): Promise<SQLiteDBConnection> {
    if (!this.ready) {
      this.ready = this.init();
    }
    return this.ready;
  }

  /** Sur navigateur, la base vit en mémoire : il faut l'enregistrer après chaque écriture. */
  async persist(): Promise<void> {
    if (Capacitor.getPlatform() === "web") {
      await this.sqlite.saveToStore(DB_NAME);
    }
  }

  private async init(): Promise<SQLiteDBConnection> {
    if (Capacitor.getPlatform() === "web") {
      await customElements.whenDefined("jeep-sqlite");
      const jeep = document.querySelector("jeep-sqlite") as any;
      await jeep.componentOnReady();
      await this.sqlite.initWebStore();
    }

    const consistent = (await this.sqlite.checkConnectionsConsistency()).result;
    const exists = (await this.sqlite.isConnection(DB_NAME, false)).result;

    const db =
      consistent && exists
        ? await this.sqlite.retrieveConnection(DB_NAME, false)
        : await this.sqlite.createConnection(DB_NAME, false, "no-encryption", 1, false);

    await db.open();
    await db.execute(SCHEMA);
    await this.persist();
    return db;
  }
}
