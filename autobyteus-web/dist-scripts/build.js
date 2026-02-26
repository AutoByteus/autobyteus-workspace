"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_builder_1 = require("electron-builder");
const generateIcons_1 = require("./generateIcons");
function getPlatform() {
    const args = process.argv.slice(2);
    if (args.includes('--linux'))
        return 'LINUX';
    if (args.includes('--windows'))
        return 'WINDOWS';
    if (args.includes('--mac'))
        return 'MAC';
    const directPlatform = args[0]?.toUpperCase();
    if (['LINUX', 'WINDOWS', 'MAC'].includes(directPlatform)) {
        return directPlatform;
    }
    return 'ALL';
}
const platform = getPlatform();
const options = {
    appId: 'com.autobyteus.app',
    productName: 'AutoByteus',
    directories: {
        output: 'electron-dist'
    },
    files: [
        "dist/**/*",
        "package.json"
    ],
    extraMetadata: {
        main: "dist/electron/main.js"
    },
    asar: false,
    // Default icon for all platforms
    icon: 'build/icons/512x512.png',
    win: {
        target: ['nsis'],
        icon: 'build/icons/icon.ico'
    },
    mac: {
        target: ['dmg'],
        icon: 'build/icons/icon.icns'
    },
    linux: {
        target: ['AppImage'],
        icon: 'build/icons' // Linux will use the icons directory containing multiple sizes
    }
};
const buildConfig = {
    config: options
};
if (platform !== 'ALL') {
    buildConfig.targets = electron_builder_1.Platform[platform].createTarget();
}
else {
    // When building for all platforms, create a combined target map
    buildConfig.targets = new Map([
        [electron_builder_1.Platform.LINUX, new Map([[electron_builder_1.Arch.x64, ['AppImage']]])],
        [electron_builder_1.Platform.WINDOWS, new Map([[electron_builder_1.Arch.x64, ['nsis']]])],
        [electron_builder_1.Platform.MAC, new Map([[electron_builder_1.Arch.x64, ['dmg']]])]
    ]);
}
async function main() {
    try {
        // Generate icons first
        await (0, generateIcons_1.generateIcons)();
        // Then proceed with electron-builder
        console.log('Starting electron-builder...');
        const result = await (0, electron_builder_1.build)(buildConfig);
        console.log('Build completed:', result);
    }
    catch (error) {
        console.error('Build process failed:', error);
        process.exit(1);
    }
}
// Run the build process
main();
