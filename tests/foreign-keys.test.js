
const seederFk = require('../lib');
const { assert } = require('chai');

const data0 = {
  table1: [
    { id: 1, name: 'a' },
    { id: 2, name: 'b' }
  ],
  table2: [
    { _id: 11, name: 'aa' },
    { _id: 12, name: 'bb' }
  ]
};

const data1 = {
  users: [
    { id: 1, name: 'a' },
    { id: 2, name: 'b' }
  ],
  posts: [
    { _id: 11, name: 'aa', userId: '->users' },
    { _id: 12, name: 'bb', userId: '->users' },
    { _id: 13, name: 'cc', userId: '->users' },
    { _id: 14, name: 'dd', userId: '->users' },
    { _id: 15, name: 'ee', userId: '->users' }
  ]
};

const data2 = {
  users: [
    { id: 1, name: 'a' },
    { id: 2, name: 'b' },
    { id: 3, name: 'c' },
    { id: 4, name: 'd' },
    { id: 5, name: 'e' }
  ],
  posts: [
    { _id: 11, name: 'aa', userId: '->users:random' },
    { _id: 12, name: 'bb', userId: '->users:random:' },
    { _id: 13, name: 'cc', userId: '->users:random:id' },
    { _id: 14, name: 'dd', userId: '->users:random:name' },
    { _id: 15, name: 'ee', userId: '->users:random:foo' } // undefined
  ]
};

const data3 = {
  users: [
    { id: 1, name: 'a' },
    { id: 2, name: 'b' },
    { id: 3, name: 'c' },
    { id: 4, name: 'd' }
  ],
  posts: [
    { _id: 11, name: 'aa', userIds: ['->users:next', '->users:next'] },
    { _id: 12, name: 'bb', userIds: ['->users:next', '->users:next', '->users:next'] }
  ]
};

const data4 = {
  users: [
    { id: 1, name: 'a' },
    { id: 2, name: 'b' }
  ],
  posts: [
    { _id: 11, name: 'aa', userId: '->users:next', foo: '->users:curr' },
    { _id: 12, name: 'bb', userId: '->users:next', foo: '->users:curr', bar: '->users:curr' },
    { _id: 13, name: 'cc', userId: '->users:next', foo: '->users:curr' },
    { _id: 14, name: 'dd', userId: '->users:next', foo: '->users:curr' },
    { _id: 15, name: 'ee', userId: '->users:next', foo: '->users:curr' }
  ]
};

const data5 = {
  users: [
    { id: 1, name: 'a', foo: { bar: 'a1' }, baz: [{ bar: 'a2' }] },
    { id: 2, name: 'b', foo: { bar: 'b1' }, baz: [{ bar: 'b2' }] }
  ],
  posts: [
    { _id: 11, name: 'aa', fooBar: '->users:next:foo.bar', barBar: '->users:curr:baz.0.bar' },
    { _id: 12, name: 'bb', fooBar: '->users:next:foo.bar', barBar: '->users:curr:baz.0.bar' }
  ]
};

const testOptions = { testModeIndex: true };

describe('foreign-keys.test.js - handles types', () => {
  describe('no placeholders', () => {
    const ret = clone(data0);
    seederFk(ret);

    assert.deepEqual(ret, data0);
  });

  describe('random type', () => {
    it('->users', () => {
      const recs = clone(data1);
      seederFk(recs, testOptions);

      assert.deepEqual(recs.posts, [
        { _id: 11, name: 'aa', userId: 1 },
        { _id: 12, name: 'bb', userId: 2 },
        { _id: 13, name: 'cc', userId: 1 },
        { _id: 14, name: 'dd', userId: 2 },
        { _id: 15, name: 'ee', userId: 1 }
      ]);
    });

    it('->users:random & users:random:fieldName', () => {
      const recs = clone(data2);
      seederFk(recs, testOptions);

      assert.deepEqual(recs.posts, [
        { _id: 11, name: 'aa', userId: 1 },
        { _id: 12, name: 'bb', userId: 2 },
        { _id: 13, name: 'cc', userId: 3 },
        { _id: 14, name: 'dd', userId: 'd' },
        { _id: 15, name: 'ee', userId: undefined }
      ]);
    });
  });

  describe('next type', () => {
    it('->users:next', () => {
      const recs = clone(data3);
      seederFk(recs, testOptions);

      assert.deepEqual(recs.posts, [
        { _id: 11, name: 'aa', userIds: [1, 2] },
        { _id: 12, name: 'bb', userIds: [3, 4, 1] }
      ]);
    });

    it('->users:next & users:curr', () => {
      const recs = clone(data4);
      seederFk(recs, testOptions);

      assert.deepEqual(recs.posts, [
        { _id: 11, name: 'aa', userId: 1, foo: 1 },
        { _id: 12, name: 'bb', userId: 2, foo: 2, bar: 2 },
        { _id: 13, name: 'cc', userId: 1, foo: 1 },
        { _id: 14, name: 'dd', userId: 2, foo: 2 },
        { _id: 15, name: 'ee', userId: 1, foo: 1 }
      ]);
    });

    it('handles dot notation', () => {
      const recs = clone(data5);
      seederFk(recs, testOptions);

      assert.deepEqual(recs.posts, [
        { _id: 11, name: 'aa', fooBar: 'a1', barBar: 'a2' },
        { _id: 12, name: 'bb', fooBar: 'b1', barBar: 'b2' }
      ]);
    });
  });
});

function clone (obj) {
  return JSON.parse(JSON.stringify(obj));
}
