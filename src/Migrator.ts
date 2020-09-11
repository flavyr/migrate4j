import { driver, auth, Driver, Record, QueryResult } from 'neo4j-driver';
import * as fs from 'fs';
import * as path from 'path';
import { Migration } from './Migration';

type MigrationMap = {
  [index: string]: Migration;
};

// prettier makes this ugly, so...
// prettier-ignore
const headMigrationCypher = (
  `MATCH (:M4jMigration)-[:MIGRATED_TO]->(head:M4jMigration)
   WHERE NOT (head)-[:MIGRATED_TO]->(:M4jMigration)`
);

export class Migrator {
  driver: Driver;
  migrationMap: MigrationMap;
  migrationsDir: string;

  constructor() {
    this.migrationMap = {};
    this.migrationsDir = process.env.M4J_MIGRATION_DIR || './neo4j_migrations';
    this.driver = driver(
      process.env.NEO4J_URI || 'bolt://localhost:7687',
      auth.basic(
        process.env.NEO4J_USER || 'neo4j',
        process.env.NEO4J_PASSWORD || 'letmein'
      )
    );
  }

  init(): boolean {
    if (fs.existsSync(this.migrationsDir)) {
      console.error('Migrations directory already exists');
      return false;
    } else {
      console.log(`Creating migrations directory at ${path.resolve(this.migrationsDir)}`);

      try {
        fs.mkdirSync(this.migrationsDir);
      } catch (error) {
        console.error('Error encountered creating migrations directory!');
        throw error;
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

    console.log('Initializing M4jMigration nodes');
    let files = fs.readdirSync(this.migrationsDir).sort();

    if (typeof migration == 'string') {
      files = files.slice(0, files.indexOf(migration) + 1);
    }

    const promises = files.map(fileName => {
      const MigrationFile = require(path.resolve(this.migrationsDir, fileName)).default;
      const m = new MigrationFile(fileName, this.driver);
      this.migrationMap[fileName] = m;
      return m.init();
    });

    await Promise.all(promises);
    return this.migrationMap;
  }

  async migrate(migration?: string): Promise<void> {
    const migrationMap = await this.loadMigrations(migration);

    const unMigratedNodes = await this.driver.session().run(
      `MATCH (m:M4jMigration)
       WHERE NOT (m)<-[:MIGRATED_TO]->(:M4jMigration)
       RETURN m.fileName as fileName
       ORDER BY m.fileName`
    );

    const migrations = unMigratedNodes.records
      .map((record: Record) => {
        const fileName = record.get('fileName');
        return migrationMap[fileName];
      })
      .filter(m => !!m) as Migration[];

    for await (let _ of this.runMigrations(migrations)) {
      console.log('✔');
    }
  }

  async rollback(migration?: String) {}

  async redo(migration?: String) {}

  private async createRelationship(fileName: string): Promise<QueryResult> {
    return this.driver.session().run(
      `OPTIONAL ${headMigrationCypher}
       MERGE (root:M4jMigration { fileName: 'rootMigration' })
       WITH coalesce(head, root) as prev
       MATCH (current:M4jMigration { fileName: $fileName })
       CREATE (prev)-[r:MIGRATED_TO { at: datetime() }]->(current)
       RETURN r`,
      { fileName }
    );
  }

  private async *runMigrations(migrations: Migration[]): AsyncGenerator<QueryResult> {
    for (let migration of migrations) {
      console.log(`Migrating ${migration.fileName}`);
      try {
        await migration.migrate();
        yield await this.createRelationship(migration.fileName);
      } catch (error) {
        console.error(error);
        throw error;
      }
    }
  }
}
