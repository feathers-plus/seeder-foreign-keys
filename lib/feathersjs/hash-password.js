
// sync version of @feathersjs/authentication-local/lib/utils/hash.js
const bcrypt = require('bcryptjs');

const BCRYPT_WORK_FACTOR_BASE = 12;
const BCRYPT_DATE_BASE = 1483228800000;
const BCRYPT_WORK_INCREASE_INTERVAL = 47300000000;

module.exports = function hasher (password) {
  let BCRYPT_CURRENT_DATE = new Date().getTime();
  let BCRYPT_WORK_INCREASE = Math.max(0, Math.floor((BCRYPT_CURRENT_DATE - BCRYPT_DATE_BASE) / BCRYPT_WORK_INCREASE_INTERVAL));
  let BCRYPT_WORK_FACTOR = Math.min(19, BCRYPT_WORK_FACTOR_BASE + BCRYPT_WORK_INCREASE);

  const salt = bcrypt.genSaltSync(BCRYPT_WORK_FACTOR);
  return bcrypt.hashSync(password, salt);
};
