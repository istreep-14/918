/**
 * Option B configuration: Control + Archives + Active spreadsheets.
 * Edit and run applyConfigToProperties() to persist.
 */

var CONFIG = {
  projectName: 'Chess Option B',
  username: 'REPLACE_ME',
  timezone: 'America/New_York'
};

function applyConfigToProperties() {
  var props = PropertiesService.getDocumentProperties();
  if (!CONFIG.username || CONFIG.username === 'REPLACE_ME') throw new Error('Set CONFIG.username');
  props.setProperty(PROP_KEYS.USERNAME, String(CONFIG.username));
  if (CONFIG.timezone) props.setProperty(PROP_KEYS.TIMEZONE, String(CONFIG.timezone));
  if (CONFIG.projectName) props.setProperty(PROP_KEYS.PROJECT_NAME, String(CONFIG.projectName));
}

