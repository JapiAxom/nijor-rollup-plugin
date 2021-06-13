const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const ReturnStyles = require('./style.js');
const GenerateID = require('./uniqueId.js');

let allNijorComponents = [];
let allNijorComponentsMap = {};

function ReturnScripts(doc,PreOrPost){
try {
    const importStatementRegex = /import[^']+(?= from .*).*/gm;
    let script = doc.window.document.querySelector(`script[execute="${PreOrPost}"]`).innerHTML;
    try {
       script.match(importStatementRegex).forEach(element=>{
        script = script.replace(element,'');
    }); 
    }catch(error){}
    return script;
} catch (error) {
    return '';
}
}

function isNijorComponent(element) {
    if(allNijorComponents.includes(element)) return true;
    return false;
}

module.exports = function(doc,scope,ComponentScope,options){
    ReturnStyles(doc,scope,options);
    let template = doc.window.document.querySelector("template").innerHTML;
    let Postscripts = ReturnScripts(doc,'post');
    let Prescripts = ReturnScripts(doc,'pre');

    // Changing the name of the components starts here
    doc.window.document.querySelectorAll("[n:imported]").forEach(child=>{
        // The ComponentScope's value is added after every imported component.
        // Ex :- <header> -> <headervxxh> depending upon ComponentScope
        let OriginalComponentName = child.tagName.toLowerCase();
        let componentName = OriginalComponentName+ComponentScope;
        let cpname = new RegExp('<'+OriginalComponentName,'gim');
        let cpnameClosing = new RegExp('</'+OriginalComponentName+'>','gim');
        template = template.replace(cpname,'<'+componentName);
        template = template.replace(cpnameClosing,'</'+componentName+'>');

        allNijorComponents.push(componentName);
        allNijorComponentsMap[componentName] = OriginalComponentName;
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
        child.setAttribute('onclick',`return window.nijor.redirect('${route}')`);
        child.setAttribute('href',route);
    });
    // Compiling n:route ends here

    // Compiling n:reload starts here
    VirtualDocument.window.document.body.querySelectorAll('[n:reload]').forEach(element=>{
        let innerContent = element.innerHTML;
        let runScript = '';
        let fnName = 'fn_$'+GenerateID(3,4)+GenerateID(3,4);

        element.setAttribute('on:reload'+element.getAttribute('n:reload'),fnName+'(this)');
        element.removeAttribute('n:reload');

        element.querySelectorAll('*').forEach(child=>{
            let elementName = child.tagName.toLowerCase();
            let OriginalComponentName = allNijorComponentsMap[elementName];
            if(isNijorComponent(elementName)){
                runScript += `

                $${OriginalComponentName}.init('${elementName}');
                await $${OriginalComponentName}.run();

                `;
            }
        });

        let fn = `async function ${fnName}(_this){
            _this.innerHTML = ${JSON.stringify(innerContent)};
            ${runScript}
        }`;

        Prescripts+=fn;
    });
    // Compiling n:reload ends here

    // Compiling on:{event} starts here
    VirtualDocument.window.document.querySelectorAll('*').forEach(child=>{
        let allAttributes = child.getAttributeNames().filter(element=>element.indexOf('on:')>-1); // Getting all the attribute names of the tag ang and filtering the attributes which start with "on:"
            allAttributes.forEach(elem=>{
                    let fnAttr = child.getAttribute(elem);
                    let fnargs = fnAttr.split('(');
                    let fnName = fnargs[0];
                    let newFuncName = '_'+ComponentScope+fnName;
                    let newFuncNameCall = '_'+ComponentScope+fnAttr;
                    let event = elem.replace(':','');
                    child.setAttribute(event,`window.nijorfunc.${newFuncNameCall}`);
                    let fnscripts = `window.nijorfunc["${newFuncName}"]=${fnName};`;
                    child.removeAttribute(elem);
                    let newPrescript = Prescripts+fnscripts;
                    Prescripts = newPrescript;
        });
    });
    // Compiling on:{event} ends here

    template = VirtualDocument.window.document.body.innerHTML;
    template = template.replace(/\s+/g,' ').trim().replace(/>\s+</g, "><");
    return {template,Postscripts,Prescripts};
}