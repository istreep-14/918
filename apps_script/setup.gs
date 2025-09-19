/**
 * Compatibility shim after project pruning.
 *
 * The legacy Apps Script entry points now delegate to the Option B setup
 * implemented in `option_b_simple/`.
 */

function setupProject() {
  // Delegates to Option B setup
  return setupOptionB();
}

function simpleSetup(username) {
  // Convenience wrapper to set username and run Option B setup
  if (typeof CONFIG !== 'undefined' && username) {
    try { CONFIG.username = String(username); } catch (e) {}
  }
  if (typeof applyConfigToProperties === 'function') applyConfigToProperties();
  return setupOptionB();
}

