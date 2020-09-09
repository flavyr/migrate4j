import { Driver, Transaction, Session, QueryResult } from 'neo4j-driver';

/* (:M4jMigration)
 *   fileName - string; name of the migration file. Used as the identifier for migrations.
 *   createdAt - timestamp; represents the time the node was created
 *               (not when the migration was run)
 *
 * [:MIGRATED_TO]
 *   on - timestamp; time the migration was run
 */

export abstract class Migration {
  driver: Driver;

  fileName: string;
  name?: string;
  description?: string;

  up?(transaction: Transaction, session: Session): Promise<void>;
  down?(transaction: Transaction, session: Session): Promise<void>;

  constructor(fileName: string, driver: Driver) {
    this.driver = driver;
    this.fileName = fileName;
  }

  async init(): Promise<QueryResult> {
    const session = this.driver.session();
    // Create the M4jMigration node if it doesn't already exist (by fileName)
    try {
      return await session.run(
        `MERGE (m:M4jMigration { fileName: $fileName })
        ON CREATE SET
          m.name = $name,
          m.description = $description,
          m.createdAt = datetime()
        RETURN m`,
        {
          fileName: this.fileName,
          name: this.name || null,
          description: this.description || null,
        }
      );
    } catch (error) {
      console.error(`Unable to create the migration node for ${this.fileName}!`, error);
      throw error;
    } finally {
      session.close();
    }
  }

  async migrate() {
    await this.transaction(async (transaction, session) => {
      return this.up && (await this.up(transaction, session));
    });
  }

  async rollback() {
    await this.transaction(async (transaction, session) => {
      return this.down && (await this.down(transaction, session));
    });
  }

  private async transaction(fn: (transaction: Transaction, session: Session) => void) {
    const session: Session = this.driver.session();
    const transaction: Transaction = session.beginTransaction();

    try {
      await fn(transaction, session);
      await transaction.commit();
    } catch (error) {
      console.error('Error encountered during transaction. Rolling back.');
      await transaction.rollback();
      throw error;
    } finally {
      session.close();
    }
  }
}
