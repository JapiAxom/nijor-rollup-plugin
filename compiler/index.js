const { createFilter } = require('@rollup/pluginutils');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const GenerateID = require('./uniqueId.js');
const TemplateLoader = require('./template.js');
function returnScriptsContent(doc,execute){
    try {
        let script = doc.window.document.querySelector('script[execute="'+execute+'"]').innerHTML;
        return script;
    } catch (error) {
        return '';
    }
}
function ReturnScripts(doc,execute){
  try {
    const importStatementRegex = /import[^']+(?= from .*).*/gm;
    let script = returnScriptsContent(doc,execute);
    let ImportStatements;
    try {
        ImportStatements = script.match(importStatementRegex).join('');
    } catch (error) {
        ImportStatements = '';
    }
    try {
       script.match(importStatementRegex).forEach(element=>{
        script = script.replace(element,'');
    }); 
    }catch(error){}
    return {ImportStatements,script};
  } catch (error) {
    return {ImportStatements:'',script:''};
  }
  
}
function ReturnModule(doc){
    let Mod = [];
    doc.window.document.querySelectorAll("[n:imported]").forEach(child=>{
        let componentVar = '$'+child.tagName.toLowerCase();
        let from = child.getAttribute('n:imported')+'.nijor';
        Mod.push(`import ${componentVar} from "${from}";`);
    });
    return Mod.join('');
}
function ReturnRunModule(doc,ComponentScope){
    let Mod = [];
    doc.window.document.querySelectorAll("[n:imported]").forEach(child=>{
    let componentVar = '$'+child.tagName.toLowerCase();
    let OriginalComponentName = child.tagName.toLowerCase();
    let componentName = OriginalComponentName+ComponentScope;
    Mod.push(`
            ${componentVar}.init('${componentName}');
            ${componentVar}.run();
          `);
    });
    return Mod.join('');
}
function NijorCompiler(rootDir,includePathOptions) {
  let opts = { include: '**/*.nijor' };
  const filter = createFilter(opts.include, opts.exclude);
  return {
  name: "nijorCompile",

  async transform(code, id) {
    if (filter(id)) {
      let newCode = code.replace('<style>','<n:style>');
      newCode = newCode.replace('</style>','</n:style>');
      const VirtualDocument = new JSDOM(newCode);
      const specsAttr = VirtualDocument.window.document.querySelector('template').getAttribute('specs') || '';
      try {
        VirtualDocument.window.document.querySelectorAll('script').forEach(child=>{
        if(child.getAttribute('execute')==="post") return;
        child.setAttribute('execute','pre');
        });
      } catch (error) {}
      const scope = GenerateID(6,20);
      const ComponentScope = GenerateID(2,5).toLowerCase();
      const template = await TemplateLoader(VirtualDocument,scope,ComponentScope,rootDir,includePathOptions);
      const scripts =  ReturnScripts(VirtualDocument,'pre').script;
      const importStatementsPre =  ReturnScripts(VirtualDocument,'pre').ImportStatements;
      const Postscripts =  ReturnScripts(VirtualDocument,'post').script;
      const importStatementsPost =  ReturnScripts(VirtualDocument,'post').ImportStatements;
      const NijorComponentClass = ' __Nijor_ComponentClass'+GenerateID(3,9);
      let mod = ReturnModule(VirtualDocument);
      let runmod = ReturnRunModule(VirtualDocument,ComponentScope);
          return {
              code: `
                import ${NijorComponentClass} from 'nijor/components';
                ${mod}
                ${importStatementsPre}
                ${importStatementsPost}
                export default new ${NijorComponentClass}(async function(${specsAttr}){
                    try{
                        ${scripts}
                        return(\`${template}\`);
                    }finally{
                        setTimeout(function(){${runmod}${Postscripts}},3);
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