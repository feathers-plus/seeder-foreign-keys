
const seederFk = require('../lib');
const { assert } = require('chai');

const data1 = {
  table1: [
    { id: 1, name: 'a' },
    { id: 2, name: 'b' },
  ],
};

const data2 = {
  table1: [
    { id: 1, name: 'a' },
    { id: 2, name: 'b' },
  ],
  table2: [
    { _id: 11, name: 'aa' },
    { _id: 12, name: 'bb' },
  ],
};

describe('no-ph: no placeholders', () => {
  it('one table', () => {
    const ret = clone(data1);
    seederFk(ret);

    assert.deepEqual(ret, data1);
  });

  it('two tables', () => {
    const ret = clone(data2);
    seederFk(ret);

    assert.deepEqual(ret, data2);
  });
});

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}