import { Migration } from '../src/Migration';

export default class Ok extends Migration {
  async up({ run }) {
    console.log('03_ok - up');
  }

  async down() {
    console.log('03_ok - down');
  }
}
