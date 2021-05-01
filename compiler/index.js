const { createFilter } = require('@rollup/pluginutils');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const chalk = require('chalk');
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
    /* convert the component imports to javascript imports
    Ex:- <header n:imported="components/header"> will convert to 
          import $header from "components/header";
    */
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
    /* 
    get the ComponentScope
    Change the name of the im
    Call the run function on the imported components.
    $header.init('header'+ComponentScope);
    $header.run();
    */
    Mod.push(`
            ${componentVar}.init('${componentName}');
            await ${componentVar}.run();
          `);
    });
    return Mod.join('');
}
function NijorCompiler(options) {
  let opts = { include: '**/*.nijor' };
  const filter = createFilter(opts.include, opts.exclude);
  return {
  name: "nijorCompile",

  async transform(code, id) {
    let componentName = id.replace('/','\\');
    componentName = id.split('\\');
    componentName = componentName.reverse();
    let msg = chalk.hex('#0099ff')(`Nijor: Compiling ${componentName[0]}.`);
    console.log(msg);
    if (filter(id)) {
      let newCode = code.replace('<style','<n:style');
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
      const {template,Postscripts} = TemplateLoader(VirtualDocument,scope,ComponentScope,options);
      const scripts =  ReturnScripts(VirtualDocument,'pre').script;
      const importStatementsPre =  ReturnScripts(VirtualDocument,'pre').ImportStatements;
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
                        setTimeout(async function(){${runmod}${Postscripts}},3);
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