
const { assert } = require('chai');
const hashPassword = require('../lib/feathersjs/hash-password');
const seederFk = require('../lib');

describe('expressions.test.js - handles expressions', () => {
  it('static expression', () => {
    const recs = {
      posts: [
        { _id: 11, name: 'aa', day: '=>new Date("December 25, 1995").getDay()' },
        { _id: 12, name: 'bb', day: '=>new Date("December 25, 1995").getDay()' },
        { _id: 13, name: 'cc', day: '=>new Date("December 25, 1995").getDay()' },
        { _id: 14, name: 'dd', day: '=>new Date("December 25, 1995").getDay()' },
        { _id: 15, name: 'ee', day: '=>new Date("December 25, 1995").getDay()' }
      ]
    };

    seederFk(recs);

    assert.deepEqual(recs.posts, [
      { _id: 11, name: 'aa', day: 1 },
      { _id: 12, name: 'bb', day: 1 },
      { _id: 13, name: 'cc', day: 1 },
      { _id: 14, name: 'dd', day: 1 },
      { _id: 15, name: 'ee', day: 1 }
    ]);
  });

  it('reference own row', () => {
    const recs = {
      posts: [
        { _id: 11, name: 'aa', count: 1, nextCount: '=>rec.count + .1' },
        { _id: 12, name: 'bb', count: 2, nextCount: '=>rec.count + .1' },
        { _id: 13, name: 'cc', count: 3, nextCount: '=>rec.count + .1' },
        { _id: 14, name: 'dd', count: 4, nextCount: '=>rec.count + .1' },
        { _id: 15, name: 'ee', count: 5, nextCount: '=>rec.count + .1' }
      ]
    };

    seederFk(recs);

    assert.deepEqual(recs.posts, [
      { _id: 11, name: 'aa', count: 1, nextCount: 1.1 },
      { _id: 12, name: 'bb', count: 2, nextCount: 2.1 },
      { _id: 13, name: 'cc', count: 3, nextCount: 3.1 },
      { _id: 14, name: 'dd', count: 4, nextCount: 4.1 },
      { _id: 15, name: 'ee', count: 5, nextCount: 5.1 }
    ]);
  });

  it('reference context', () => {
    let fooCount = 0;
    const recs = {
      posts: [
        { _id: 11, name: 'aa', count: '=>ctx.foo()' },
        { _id: 12, name: 'bb', count: '=>ctx.foo()' },
        { _id: 13, name: 'cc', count: '=>ctx.foo()' },
        { _id: 14, name: 'dd', count: '=>ctx.foo()' },
        { _id: 15, name: 'ee', count: '=>ctx.foo()' }
      ]
    };

    seederFk(recs, {
      expContext: { foo () { return fooCount++; } }
    });

    assert.deepEqual(recs.posts, [
      { _id: 11, name: 'aa', count: 0 },
      { _id: 12, name: 'bb', count: 1 },
      { _id: 13, name: 'cc', count: 2 },
      { _id: 14, name: 'dd', count: 3 },
      { _id: 15, name: 'ee', count: 4 }
    ]);
  });

  it('hashPassword', function () {
    this.timeout(10000);

    const recs = {
      posts: [
        { _id: 11, name: 'aa', password: '=>ctx.hashPassword(rec.name)' },
        { _id: 12, name: 'bb', password: '=>ctx.hashPassword(rec.name)' }
      ]
    };

    seederFk(recs, {
      expContext: { hashPassword }
    });

    recs.posts.forEach(rec => {
      assert.lengthOf(rec.password, 60);
    });
  });
});
