const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Monorepo: watch the workspace root so Metro can resolve shared packages
const workspaceRoot = path.resolve(__dirname, '../..');
config.watchFolders = [workspaceRoot];

// In pnpm monorepos the virtual store nests packages under
//   node_modules/.pnpm/<pkg@ver>/node_modules/<pkg>/
// The default transformIgnorePatterns only matches the first segment after
// node_modules/, so it never sees "react-native" and skips transformation.
// We override the pattern to also handle the pnpm .pnpm/…/node_modules/ prefix.
const packagesToTransform = [
  'react-native',
  '@react-native',
  '@react-native-community',
  'expo',
  'expo-router',
  '@expo',
  '@unimodules',
  'react-native-reanimated',
  'react-native-screens',
  'react-native-gesture-handler',
  'react-native-safe-area-context',
  'react-native-svg',
  'react-native-webview',
  'react-native-keyboard-controller',
  'react-native-worklets',
];

const pkgPattern = packagesToTransform.join('|');

// Matches EITHER:
//   node_modules/<pkg>/…          (hoisted, classic layout)
//   node_modules/.pnpm/*/node_modules/<pkg>/…  (pnpm virtual store)
config.transformer.transformIgnorePatterns = [
  `node_modules/(?!(.pnpm/.*/node_modules/)?(${pkgPattern})(/|$))`,
];

module.exports = config;
