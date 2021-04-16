const rollup = require('rollup');
const includePaths = require('rollup-plugin-includepaths');
const virtual = require('@rollup/plugin-virtual');
// var babelCore = require("@babel/core");
// const path = require('path');
async function bundle(code,includePathOptions,treeShake=true) {
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
    // result = babelCore.transformSync(result,{presets:['@babel/preset-env']}).code;
    // result = result.replace('"use strict";','');
    return result;
}
module.exports = bundle;