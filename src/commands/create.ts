import {Command, flags} from '@oclif/command'
import { Migrator } from '../Migrator'
import * as path from 'path'
import { writeFileSync } from 'fs'

function getTimestamp() {
  const date = new Date();

  return [
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
    date.getSeconds()
  ].join('')
}

const getFileTemplate = (name: string) => (
`import { Migration } from '../src/Migration';

export default class ${name} extends Migration {
  async up({ run }) {

  }

  async down({ run }) {

  }
}`)

export default class Create extends Command {
  static description = 'Create a new migration file prefixed with the current datetime.'

  static flags = {
    help: flags.help({char: 'h'}),
    prefix: flags.string({char: 'p', description: 'Prefix to use instead of current datetime'}),
  }

  static args = [{
    name: 'name',
    required: true,
    description: 'Name of the migration (e.g., AddFooToBar)'
  }]

  async run() {
    const {args, flags} = this.parse(Create)

    const prefix = flags.prefix ?? getTimestamp()
    if (args.name) {
      const migrator = new Migrator()
      const fileName = `${prefix}_${args.name}.ts`
      const filePath = path.resolve(migrator.migrationsDir, fileName)
      this.log(`Creating migration at ${migrator.migrationsDir}/${fileName}`)
      writeFileSync(filePath, getFileTemplate(args.name))
    }
  }
}
