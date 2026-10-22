const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);
// 웹은 OTF 대신 절반 크기인 woff2 글꼴을 쓴다(src/theme/fontFiles.web.ts).
config.resolver.assetExts.push("woff2");

module.exports = config;
