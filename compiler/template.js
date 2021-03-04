const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const fs = require('fs');
const path = require('path');
const bundle = require('./bundler.js');
const ReturnStyles = require('./style.js');
const GenerateID = require('./uniqueId.js');
async function ReturnScripts(doc,rootDir){
try {
    return await bundle(doc.window.document.querySelector('script[execute="pre"]').innerHTML,rootDir,false);
} catch (error) {
    return '';
}
}
module.exports = async function(doc,scope,rootDir){
    ReturnStyles(doc,scope,rootDir);
    let template = doc.window.document.querySelector("template").innerHTML;
    // Compiling {{view}} starts here
    try {
        template.match(/{{(.*)}}/g).forEach(child=>{
            let view_value = child.replace('{{','').replace('}}','').replace(/ /g,'');
            let newValue = `<nijorview view="${view_value}" style="font:inherit;background-color:transparent;"></nijorview>`;
            template = template.replace(child,newValue);
        });
    } catch (error) {}
    // Compiling {{view}} ends here
    template = template.replace(/`/g,'\\`');
    template = template.replace(/{/g,'${');
    template = template.replace(/\\\${/g,'\{');
    const VirtualDocument = new JSDOM(template);
    let scripts = await ReturnScripts(doc,rootDir);
    // Adding the n-scope attribute starts here
    VirtualDocument.window.document.body.querySelectorAll('*').forEach((child) => {
        if(child.hasAttribute('n-scope') || child.tagName.toLowerCase()==="nijordata") return;
        child.setAttribute('n-scope',scope);
    });
    // Adding the n-scope attribute ends here

    // Compiling n:route starts here
    VirtualDocument.window.document.body.querySelectorAll('a[n:route]').forEach(child=>{
        let route = child.getAttribute('n:route');
        child.setAttribute('onclick',`(function(){try{history.pushState(null,null,'${route}');history.pushState(null,null,'${route}');history.back();}catch(e){window.location.href='${route}';}})()`);
        child.removeAttribute('n:route');
    });
    // Compiling n:route ends here

    // Compiling n:model starts here
    VirtualDocument.window.document.querySelectorAll('[n:model]').forEach(child=>{
        let model = child.getAttribute('n:model');
        child.setAttribute('n-model',model);
        child.removeAttribute('n:model');
        if(child.tagName==="INPUT"){
            child.setAttribute('oninput',`fn_Nijorbind(this)`);
        }
    });
    // Compiling n:model ends here

    // Compiling on:{event} starts here
    VirtualDocument.window.document.querySelectorAll('*').forEach(async child=>{
        let allAttributes = child.getAttributeNames().filter(element=>element.indexOf('on:')>-1); // Getting all the attribute names of the tag ang and filtering the attributes which start with "on:"
            allAttributes.forEach(async elem=>{
                    let fnAttr = child.getAttribute(elem);
                    let fnargs = fnAttr.split('(');
                    fnAttr = fnargs[0];
                    let newFunc = 'fn_'+GenerateID(5,25);
                    let funcID = newFunc+'('+fnargs[1];
                    child.removeAttribute(elem);
                    child.setAttribute(elem.replace(':',''),`${funcID}`);
                    let newScript = scripts.replace(new RegExp(fnAttr,'g'),newFunc);
                    newScript = newScript+='console.log('+funcID+');';
                    newScript = await bundle(newScript,rootDir,true);
                    newScript = newScript.replace('console.log('+funcID+');','');
                    fs.appendFileSync(path.join(rootDir,'app/static/script.js'),newScript.replace(/\s+/g,' ').trim().replace(') {','){'));
        });
    });
    // Compiling on:{event} ends here
    
    template = VirtualDocument.window.document.body.innerHTML;
    template = template.replace(/\s+/g,' ').trim().replace(/>\s+</g, "><");;
    return template;
}