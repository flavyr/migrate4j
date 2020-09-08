import { driver, auth, Driver, Record } from 'neo4j-driver';
import * as fs from 'fs';
import * as path from 'path';
import { Migration } from './Migration';

type MigrationMap = {
  [index: string]: Migration;
};

export class Migrator {
  driver: Driver;
  migrations: MigrationMap;
  migrationsDir: string;

  constructor() {
    this.migrations = {};
    this.migrationsDir = process.env.M4J_MIGRATION_DIR || './neo4j_migrations';
    this.driver = driver(
      process.env.NEO4J_URI || 'bolt://localhost:7687',
      auth.basic(
        process.env.NEO4J_USER || 'neo4j',
        process.env.NEO4J_PASSWORD || 'letmein'
      )
    );
  }

  init() {
    if (fs.existsSync(this.migrationsDir)) {
      console.error('Migrations directory already exists');
      return false;
    } else {
      console.log(`Creating migrations directory at ${path.resolve(this.migrationsDir)}`);

      try {
        fs.mkdirSync(this.migrationsDir);
      } catch (error) {
        console.error('Error encountered creating migrations directory!', error);
        return false;
      }

      return true;
    }
  }

  // load all migration files from the migration directory
  async loadMigrations(migration?: string): Promise<MigrationMap> {
    if (!fs.existsSync(this.migrationsDir)) {
      console.error('Migrations directory does not exist! Try running "migrate4j init".');
      return {};
    }

    console.log('Initializing Migration nodes');
    let files = fs.readdirSync(this.migrationsDir).sort();

    if (migration) {
      files = files.slice(0, files.indexOf(migration) + 1);
    }

    const promises = files.map(fileName => {
      const MigrationFile = require(path.resolve(this.migrationsDir, fileName)).default;
      const m = new MigrationFile(fileName, this.driver);
      this.migrations[fileName] = m;
      return m.init();
    });

    await Promise.all(promises);
    return this.migrations;
  }

  private async createMigratedTo(fileName: string) {
    try {
      console.log('creating relationship', fileName);
      return this.driver.session().run(
        `OPTIONAL MATCH (:M4jMigration)-[:MIGRATED_TO]->(head:M4jMigration)
         WHERE NOT (head)-[:MIGRATED_TO]->(:M4jMigration)
         MERGE (root:M4jMigration { fileName: 'rootMigration' })
         WITH coalesce(head, root) as prev
         MATCH (current:M4jMigration { fileName: $fileName })
         CREATE (prev)-[r:MIGRATED_TO]->(current)
         RETURN r`,
        { fileName }
      );
    } catch (error) {
      console.error('Unable to query the database!', error);
      return error;
    }
  }

  async migrate(migration?: string): Promise<void[]> {
    const migrations = await this.loadMigrations(migration);

    const results = await this.driver.session().run(
      `MATCH (m:M4jMigration)
       WHERE NOT (m)<-[:MIGRATED_TO]->(:M4jMigration)
       RETURN m.fileName as fileName
       ORDER BY m.fileName`
    );

    let finished = false;
    const promises = results.records.map((record: Record) => {
      const fileName = record.get('fileName');
      if (finished) return Promise.resolve();

      if (fileName) {
        console.log(`Migrating ${fileName}...`);

        if (migration && migration == fileName) {
          finished = true;
        }

        migrations[fileName] && migrations[fileName].migrate();
        return this.createMigratedTo(fileName);
      } else {
        return Promise.reject();
      }
    });

    return Promise.all(promises);
  }

  async rollback(migration?: String) {}

  async redo(migration?: String) {}
}
