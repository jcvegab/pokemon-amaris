// Make `jest` available as a global so spec files don't need to import it.
// `describe`/`it`/`expect` are injected by Jest when `injectGlobals: true`.
const { jest: jestGlobal } = require('@jest/globals');
globalThis.jest = jestGlobal;
