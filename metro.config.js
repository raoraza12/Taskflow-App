// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Fix for query-string@7 and other CJS/ESM hybrid modules on web
// query-string v9 uses ESM exports that break @react-navigation on web
// We pin to v7 (CJS) and disable package exports resolution to ensure CJS build is used
config.resolver.unstable_enablePackageExports = false;

// Ensure query-string resolves to its main CJS entry
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'query-string') {
    return context.resolveRequest(context, 'query-string', platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;

