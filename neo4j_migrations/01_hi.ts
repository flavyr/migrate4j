import { Migration } from '../src/Migration';

export default class Hi extends Migration {
  async up({ run }) {
    console.log('01_hi - up');
  }

  async down() {
    console.log('01_hi - down');
  }
}
