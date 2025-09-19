/**
 * Simple configuration for the streamlined pipeline.
 *
 * Edit CONFIG values directly, then run applyConfigToProperties().
 */

var CONFIG = {
  projectName: 'Chess Simple',
  username: 'REPLACE_ME',
  timezone: 'America/New_York'
};

function applyConfigToProperties() {
  var props = PropertiesService.getDocumentProperties();
  if (!CONFIG || !CONFIG.username || CONFIG.username === 'REPLACE_ME') {
    throw new Error('Set CONFIG.username before applying configuration');
  }
  props.setProperty(PROP_KEYS.USERNAME, String(CONFIG.username));
  if (CONFIG.timezone) props.setProperty(PROP_KEYS.TIMEZONE, String(CONFIG.timezone));
  if (CONFIG.projectName) props.setProperty(PROP_KEYS.PROJECT_NAME, String(CONFIG.projectName));
}

