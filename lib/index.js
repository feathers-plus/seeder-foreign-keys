
/* eslint no-new-func: 0 */
/*
 data = {
   [tableName]: [
     { id: ..., desc: ..., ... }, // or _id: ...
     { id: ..., desc: ..., ... },
   ]
 };

 options = {
   fkLeader: '->',        // default
   expLeader: '=>',       // default
   context: {},           // Inserted into 'opts' for function calls
   testModeIndex: false,  // predictable random indexes
 }:

 placeholderValue =
   // Select the table [tableName].
   'tableName:*'
   // Select a row in [tableName]
   'tableName:random:*'   // Select a random row. Same row may be selected multiple time.
   'tableName:next:*'     // Select a random row. That row will not be selected again before all other rows have been selected.
   'tableName:curr:*'     // Refers to the row selected by the previous 'tableName:next:*'.
   'tableName::*'         // Short cut for 'tableName:random:*'.
   // Select the value of a field in the selected row
   '*fieldName'           // Copy value of field [fieldName]. Dot notation supported.
   '*'                    // Copy value of `record.id || record._id`.

 Example
 =======
 // Key value from a random record. Uses `record.id || record._id`.
 userId: '->users:random',
 // Key value from 3 random but distinct records.
 memberIds: [
   '->users.next', '->users.next', '->users.next'
 ],
 // Key, firstName & lastName values from 3 random but distinct records.
 members: [
   { id: '->users:next', firstName: '->users.curr.firstName', lastName: '->users.curr.lastName' },
   { id: '->users:next', firstName: '->users.curr.firstName', lastName: '->users.curr.lastName' },
   { id: '->users:next', firstName: '->users.curr.firstName', lastName: '->users.curr.lastName' },
 ],
 */

const debug = require('debug')('seeder-foreign-keys');
const faker = require('faker');
const get = require('lodash.get');
const random = require('lodash.random');
const shuffle = require('lodash.shuffle');
const traverse = require('traverse');
const { inspect } = require('util');

const hashPassword = require('../lib/feathersjs/hash-password');

module.exports = function (data /* modified in place */, options = {}) {
  const testModeIndex = options.testModeIndex || false;
  const fkLeader = options.fkLeader || '->';
  const fkLeaderLen = fkLeader.length;
  const expLeader = options.expLeader || '=>';
  const expLeaderLen = expLeader.length;

  // extract table keys
  const tableNames = Object.keys(data);
  const tablesInfo = {};

  tableNames.forEach(tableName => {
    const table = data[tableName];
    const sampleRec = table[0];
    const keyName = !sampleRec ? '_id' : ('id' in sampleRec ? 'id' : '_id');

    tablesInfo[tableName] = {
      keyName,
      currRec: -1,
      isShuffled: false,
      len: table.length,
      keys: table.map((record, i) => i)
    };
  });

  debug('tablesInfo:', tablesInfo);

  // Create context for functions
  const ctx = Object.assign({}, { data, faker, tablesInfo, hashPassword }, options.expContext || {});

  // process each table
  tableNames.forEach(tableName => {
    const ourKeyName = tablesInfo[tableName].keyName;
    debug('process table:', tableName, ourKeyName);

    // process each record
    data[tableName].forEach((rec, ix) => {
      debug('.process row', rec);

      ctx.dataCurrIndex = ix;

      // no table keys have been shuffled yet for this record
      tableNames.forEach(tableName => {
        const tableInfo = tablesInfo[tableName];
        tableInfo.isShuffled = false;
        if (!testModeIndex) tableInfo.currRec = -1;
      });

      // debug('..prep tablesInfo', tablesInfo)

      // traverse the row's properties
      traverse(rec).forEach(replacePlaceholders); // `rec` is converted in place.

      function replacePlaceholders (value) {
        if (!this.isLeaf) return;

        // handle foreign keys
        if (typeof value === 'string' && value.substr(0, fkLeaderLen) === fkLeader) {
          replaceForeignKey(this);
        }

        // handle expressions
        if (typeof value === 'string' && value.substr(0, expLeaderLen) === expLeader) {
          replaceExpression(this);
        }

        function replaceForeignKey (that) {
          debug('...fk leaf:', that.key, value);

          // Validate placeholder
          const ph = value.substr(fkLeaderLen);
          let [targetTableName = '', randomType = 'random', fieldName] = ph.split(':');

          const targetTableInfo = tablesInfo[targetTableName];
          debug('...ph', targetTableName, randomType, fieldName, targetTableInfo);
          if (!targetTableInfo) throw new Error(`${value}: table not found. (seeder-foreign-keys)`);

          // Get target table information
          let { keyName, isShuffled, len, keys } = targetTableInfo;
          fieldName = fieldName || keyName;
          debug('...target', keyName, isShuffled, len, keys);

          if (len === 0) throw new Error(`${value}: table has no records. (seeder-foreign-keys)`);

          // Get index of target record
          let index;
          switch (randomType) {
            case 'random':
              index = testModeIndex ? bumpCurrRec(targetTableInfo) : random(len - 1);
              break;
            case 'next':
              debug('...next', isShuffled, testModeIndex);
              if (!isShuffled && !testModeIndex) {
                keys = targetTableInfo.keys = shuffle(keys);
                targetTableInfo.currRec = -1;
              }

              targetTableInfo.isShuffled = true;
              index = keys[bumpCurrRec(targetTableInfo)];
              break;
            case 'curr':
              if (!isShuffled) throw new Error(`${value}: no prior "next". (seeder-foreign-keys)`);

              index = tablesInfo[targetTableName].currRec;
              break;
            default:
              throw new Error(`${value}: invalid random type. (seeder-foreign-keys)`);
          }
          debug('...index', index, len, testModeIndex);

          // Replace by target field value
          const targetValue = get(data[targetTableName][index], fieldName);
          that.update(targetValue);
        }

        function replaceExpression (that) {
          debug('...exp leaf:', that.key, value);
          const exp = value.substr(expLeaderLen);

          try {
            const func = new Function('rec', 'ctx', `return ${exp};`);
            const val = func(rec, ctx, data);
            debug('val', val);
            that.update(val);
          } catch (err) {
            console.log(err);
            throw new Error(`${value}: ${err.message}. (seeder-foreign-keys)`);
          }
        }
      }
    });
  });
};

function bumpCurrRec (targetTableInfo /* modified */) {
  let index = targetTableInfo.currRec + 1;

  if (index >= targetTableInfo.len) {
    index = 0;
  }

  targetTableInfo.currRec = index;
  return index;
}

function inspector (desc, obj) { // eslint-disable-line
  console.log(desc);
  console.log(inspect(obj, { colors: true, depth: 5 }));
}
