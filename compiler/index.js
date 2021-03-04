const { createFilter } = require('@rollup/pluginutils');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const bundle = require('./bundler.js');
const GenerateID = require('./uniqueId.js');
const TemplateLoader = require('./template.js');
async function ReturnScripts(doc,rootDir,execute){
  try {
    return await bundle(doc.window.document.querySelector('script[execute="'+execute+'"]').innerHTML, rootDir, false);
  } catch (error) {
    return '';
  }
}
function ReturnModule(doc){
    let Mod = [];
    doc.window.document.querySelectorAll("[n:imported]").forEach(child=>{
        let componentVar = 'NijorComponent_'+child.tagName.toLowerCase();
        let componentName = child.tagName.toLowerCase();
        let from = child.getAttribute('n:imported')+'.nijor';
        Mod.push(`
        import ${componentVar} from "${from}";
        ${componentVar}.init('${componentName}');`
        );
    });
    return Mod.join('');
}
function ReturnRunModule(doc){
    let Mod = [];
    doc.window.document.querySelectorAll("[n:imported]").forEach(child=>{
    let componentVar = 'NijorComponent_'+child.tagName.toLowerCase();
    Mod.push(`${componentVar}.run();`);
    });
    return Mod.join('');
}
function NijorCompiler(rootDir) {
  let opts = { include: '**/*.nijor' };
  const filter = createFilter(opts.include, opts.exclude);
  return {
  name: "nijorCompile",

  async transform(code, id) {
    if (filter(id)) {
      const VirtualDocument = new JSDOM(code);
      const specsAttr = VirtualDocument.window.document.querySelector('template').getAttribute('specs') || '';
      try {
        VirtualDocument.window.document.querySelectorAll('script').forEach(child=>{
        if(child.getAttribute('execute')==="post") return;
        child.setAttribute('execute','pre');
        });
      } catch (error) {}
      const scope = GenerateID(6,20);
      const template = await TemplateLoader(VirtualDocument,scope,rootDir);
      const scripts = await ReturnScripts(VirtualDocument,rootDir,'pre');
      const Postscripts = await ReturnScripts(VirtualDocument,rootDir,'post');
      const NijorComponentClass = ' __Nijor_ComponentClass'+GenerateID(3,9);
      let mod = ReturnModule(VirtualDocument);
      let runmod = ReturnRunModule(VirtualDocument);
          return {
              code: `
                import ${NijorComponentClass} from 'nijor/components';
                ${mod}
                export default new ${NijorComponentClass}((${specsAttr})=>{
                    try{
                        ${scripts}
                        return(\`${template}\`);
                    }finally{
                        setTimeout(()=>{${runmod}${Postscripts}},3);
                    }
                    
                });
              `,
              map: { mappings: "" }
            };
    }
  }
  };
}
module.exports = NijorCompiler;