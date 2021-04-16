const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const fs = require('fs');
const path = require('path');
const bundle = require('./bundler.js');
const ReturnStyles = require('./style.js');
const GenerateID = require('./uniqueId.js');
async function ReturnScripts(doc,includePathOptions){
try {
    return await bundle(doc.window.document.querySelector('script[execute="pre"]').innerHTML,includePathOptions,false);
} catch (error) {
    return '';
}
}
module.exports = async function(doc,scope,ComponentScope,rootDir,includePathOptions){
    ReturnStyles(doc,scope,rootDir);
    let template = doc.window.document.querySelector("template").innerHTML;
    // Changing the name of the components starts here
    doc.window.document.querySelectorAll("[n:imported]").forEach(child=>{
        // The ComponentScope's value is added after every imported component.
        // Ex :- <header> -> <headervxxh> depending upon ComponentScope
        let OriginalComponentName = child.tagName.toLowerCase();
        let componentName = OriginalComponentName+ComponentScope;
        let cpname = new RegExp('<'+OriginalComponentName,'gim');
        let cpname2 = new RegExp('</'+OriginalComponentName+'>','gim');
        template = template.replace(cpname,'<'+componentName);
        template = template.replace(cpname2,'</'+componentName+'>');
    });
    // Changing the name of the components ends here

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
    let scripts = await ReturnScripts(doc,includePathOptions);

    // Adding the n-scope attribute starts here
    VirtualDocument.window.document.body.querySelectorAll('*').forEach((child) => {
        if(child.hasAttribute('n-scope') || child.tagName.toLowerCase()==="nijordata") return;
        child.setAttribute('n-scope',scope);
    });
    // Adding the n-scope attribute ends here
    // Compiling n:route starts here
    VirtualDocument.window.document.body.querySelectorAll('a[n:route]').forEach(child=>{
        let route = child.getAttribute('n:route');
        child.removeAttribute('n:route');
        if(route.charAt(0)==='#'){
            child.setAttribute('href',route);
            return;
        }
        child.setAttribute('onclick',`window.location.n_redirect('${route}')`);
    });
    // Compiling n:route ends here

    // Compiling n:model starts here
    VirtualDocument.window.document.querySelectorAll('[n:model]').forEach(child=>{
        let model = child.getAttribute('n:model');
        child.setAttribute('n-model',model);
        child.removeAttribute('n:model');
        if(child.tagName==="INPUT"){
            child.setAttribute('oninput',`fn_Nijorview(this)`);
            child.setAttribute('onchange',`fn_Nijorview(this)`);
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
    template = template.replace(/\s+/g,' ').trim().replace(/>\s+</g, "><");
    return template;
}