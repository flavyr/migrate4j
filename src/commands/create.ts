import { Command, flags } from '@oclif/command';
import { Migrator } from '../Migrator';
import * as path from 'path';
import { writeFileSync } from 'fs';

function getTimestamp() {
  const date = new Date();

  return [
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
    date.getSeconds(),
  ].join('');
}

// prettier-ignore
const getTsFileTemplate = (name: string) =>
`import { Migration } from 'migrate4j';

export default class ${name} extends Migration {
  async up(tx) {

  }

  async down(tx) {

  }
}`;

// prettier-ignore
const getJsFileTemplate = (name: string) =>
`const { Migration } = require('migrate4j');

class ${name} extends Migration {
  async up(tx) {

  }

  async down(tx) {

  }
}

module.exports.default = test;`;

export default class Create extends Command {
  static description = 'Create a new migration file prefixed with the current datetime.';

  static flags = {
    help: flags.help({ char: 'h' }),
    prefix: flags.string({
      char: 'p',
      description: 'Prefix to use instead of current datetime',
    }),
    js: flags.boolean({
      char: 'j',
      description: 'Create a JS template. Optionally configurable by M4J_JS env var.',
    }),
  };

  static args = [
    {
      name: 'name',
      required: true,
      description: 'Name of the migration (e.g., AddFooToBar)',
    },
  ];

  async run() {
    const { args, flags } = this.parse(Create);
    const prefix = flags.prefix ?? getTimestamp();
    const useJs = flags.js || process.env.M4J_JS;
    if (args.name) {
      const migrator = new Migrator();

      const extension = useJs ? 'js' : 'ts';
      const getFileTemplate = useJs ? getJsFileTemplate : getTsFileTemplate;

      const fileName = `${prefix}_${args.name}.${extension}`;
      const filePath = path.resolve(migrator.migrationsDir, fileName);

      this.log(`Creating migration at ${migrator.migrationsDir}/${fileName}`);
      writeFileSync(filePath, getFileTemplate(args.name));
    }
  }
}
