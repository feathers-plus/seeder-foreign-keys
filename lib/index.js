
/*
 data = {
   [tableName]: [
     { id: ..., desc: ..., ... }, // or _id: ...
     { id: ..., desc: ..., ... },
   ]
 };

 options = {
   fkLeader: '->',        // default
   evalLeader: '=>',      // default
   evalContext: {},       // added to { row: current-row-being-processed }
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

 TODO TODO TODO
 Allow expressions e.g. `=newDate(1988, 08, 16)`
 */

const debug = require('debug')('seeder-foreign-keys');
const get = require('lodash.get');
const random = require('lodash.random');
const shuffle = require('lodash.shuffle');
const traverse = require('traverse');
const { inspect } = require('util');

const types = ['random', 'next', 'curr'];

module.exports = function (data /* modified in place */, options = {}) {
  const fkLeader = options.fkLeader || '->';
  const fkLeaderLen = fkLeader.length;
  const testModeIndex = options.testModeIndex || false;

  // extract table keys
  const tableNames = Object.keys(data);
  const tablesInfo = {};

  tableNames.forEach(tableName => {
    const table = data[tableName];
    const sampleRec = table[0];
    const keyName = !sampleRec ?  '_id' : ('id' in sampleRec ? 'id' : '_id');

    tablesInfo[tableName] = {
      keyName,
      currRec: -1,
      isShuffled: false,
      len: table.length,
      keys: table.map(record => record[keyName]),
    };
  });

  debug('tablesInfo:', tablesInfo)

  // process each table
  tableNames.forEach(tableName => {
    const ourKeyName = tablesInfo[tableName].keyName;
    debug('process table:', tableName, ourKeyName);

    // process each record
    data[tableName].forEach(rec => {
      debug('.process row', rec);

      // no table keys have been shuffled yet for this record
      tableNames.forEach(tableName => {
        const tableInfo = tablesInfo[tableName];
        tableInfo.isShuffled = false;
        if (!testModeIndex) tableInfo.currRec = -1;
      });

      //debug('..prep tablesInfo', tablesInfo)

      // traverse the placeholders
      traverse(rec).forEach(replacePlaceholders); // `rec` is converted in place.

      function replacePlaceholders(value) {
        // Return if not a placeholder
        if (!this.isLeaf) return;
        if (typeof value !== 'string' || value.substr(0, fkLeaderLen) !== fkLeader) return;
        debug('...leaf:', this.key, value);

        // Validate placeholder
        const ph = value.substr(fkLeaderLen);
        let [targetTableName = '', randomType = 'random', fieldName] = ph.split(':');

        const targetTableInfo = tablesInfo[targetTableName];
        if (!targetTableInfo) throw new Error(`${value}: table not found. (seeder-foreign-keys)`);

        // Get target table information
        const { keyName, currRec, isShuffled, len, keys } = targetTableInfo;
        fieldName = fieldName || keyName;
        debug('...ph', targetTableName, randomType, fieldName);

        if (len === 0) throw new Error(`${value}: table has no records. (seeder-foreign-keys)`);

        // Get index of target record
        let index;
        switch (randomType) {
          case 'random':
            index = testModeIndex ? bumpCurrRec(targetTableInfo) : random(len - 1);
            break;
          case 'next':
            if (!isShuffled && !testModeIndex) {
              shuffle(keys); // shuffle keys in place
              targetTableInfo.currRec = -1;
            }

            targetTableInfo.isShuffled = true;
            index = bumpCurrRec(targetTableInfo);
            break;
          case 'curr':
            if (!isShuffled) throw new Error(`${value}: no prior "next". (seeder-foreign-keys)`);

            index = tablesInfo[targetTableName].currRec;
            break;
          default:
            throw new Error(`${value}: invalid random type. (seeder-foreign-keys)`);
        }
        debug('...index', index, len, testModeIndex)

        // Replace by target field value
        const targetValue = get(data[targetTableName][index], fieldName);
        this.update(targetValue)
      }
    });
  });
};

function bumpCurrRec(targetTableInfo /* modified */) {
  let index = targetTableInfo.currRec + 1;

  if (index >= targetTableInfo.len) {
    index = 0;
  }

  targetTableInfo.currRec = index;
  return index;
}

function inspector(desc, obj) {
  console.log(desc);
  console.log(inspect(obj, { colors: true, depth: 5 }));
}