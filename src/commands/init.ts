import { Command } from '@oclif/command';
import { Migrator } from '../Migrator';

export default class Init extends Command {
  static description =
    'Creates the neo4j_migrations directory (optionally configured by the M4J_MIGRATION_DIR env var).';

  async run() {
    new Migrator().init();
  }
}
