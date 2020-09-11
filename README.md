# migrate4j

Run transactional Neo4j data migrations written with Typescript.

Note: this is (obviously) under active development. Use at your own risk.

```
neo4j-migrations/202008122203_add-stuff-to-things.ts

import { Migration } from 'migrate4j';

export default class AddStuffToThings extends Migration {
  static description = "adds stuff to things"

  up(session) {
    session.run(`
      MATCH (n:Things)
      SET n.stuff = 'hi'
    `)
  }

  down(session) {
    session.run(`
      MATCH(n:Things)
      REMOVE n.stuff
    `)
  }
}
```

Migrations are run in named order. All migrations in the migrations folder will be run once.

### To create a new migration

```console
$ migrate4j create name-of-the-migration
```

this will create a file matching the pattern `current-date-timestamp_name-of-the-migration.ts`
for example: `202008122203_add-stuff-to-things.ts`

### What happens when a migration file with a date in the past is added?

For example, you have migrations `0.ts`, `2.ts`, `3.ts` and migrate.
Then you add `1.ts` and `4.ts` and migrate once more.

The migrations that have yet to run will be run in order of their filenames.

This results in migrations running in the following order:

`0.ts -> 2.ts -> 3.ts -> 1.ts -> 4.ts`

If all of the migrations were reverted and re-ran, they would run in this order:

`0.ts -> 1.ts -> 2.ts -> 3.ts -> 4.ts`

**Keep this in mind when order of migrations is important!**

Migrate4j creates a graph representing the migration chain, so you can easily tell the order in which migrations have run.

```
(:Migration)->[:MIGRATED_TO]->(:Migration)
```
