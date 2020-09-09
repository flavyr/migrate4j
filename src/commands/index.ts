import Command, { flags } from '@oclif/command';
import { Migrator } from '../Migrator';

export default class Migrate extends Command {
  static aliases = ['migrate'];

  static description = 'Run all migrations that have not yet been run';

  static flags = {
    help: flags.help({ char: 'h' }),
    // flag with a value (-n, --name=VALUE)
    to: flags.string({
      char: 't',
      description: 'Run migrations and stop after the specified filename.',
    }),
  };

  async run() {
    const { flags } = this.parse(Migrate);

    if (flags.to) {
      this.log(`Migrating to ${flags.to}...`);
    } else {
      this.log('Migrating...');
    }

    try {
      await new Migrator().migrate(flags.to);
    } catch (error) {
      this.error('Migration failed!');
    }

    this.exit();
  }
}
