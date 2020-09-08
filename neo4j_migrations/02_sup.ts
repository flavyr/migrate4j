import { Migration } from '../src/Migration';

export default class Sup extends Migration {
  async up({ run }) {
    console.log('02_sup - up');
  }

  async down() {
    console.log('02_sup - down');
  }
}
