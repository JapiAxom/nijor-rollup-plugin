const rollup = require('rollup');
const includePaths = require('rollup-plugin-includepaths');
const virtual = require('@rollup/plugin-virtual');
var babelCore = require("@babel/core");
const path = require('path');
async function bundle(code, rootDir,treeShake=true) {
    let includePathOptions = {
        include: {
            'nijor/components': path.join(rootDir, 'nijor/src/components.js'),
            'nijor/router': path.join(rootDir, 'nijor/src/router.js'),
            'nijor/#router': path.join(rootDir, 'nijor/src/#router.js'),
            'nijor/requests': path.join(rootDir, 'nijor/src/requests.js'),
        },
        paths: [path.join(rootDir, 'src')],
        external: [],
        extensions: ['.js', '.nijor']
    };
    const inputOptions = {
        input: 'virtualScript',
        treeshake: treeShake,
        plugins: [
            includePaths(includePathOptions),
            virtual({
                virtualScript: code
            })
        ]
    };
    const bundle = await rollup.rollup(inputOptions);
    const { output } = await bundle.generate({ format: 'es' });
    for (const chunkOrAsset of output) {
        if (chunkOrAsset.type === 'asset') {
        } else {
        }
    }
    let result = await output[0].code;
    result = babelCore.transformSync(result,{presets:['@babel/preset-env']}).code;
    result = result.replace('"use strict";','');
    return result;
}
module.exports = bundle;