const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const ReturnStyles = require('./style.js');
function ReturnScripts(doc){
try {
    const importStatementRegex = /import[^']+(?= from .*).*/gm;
    let script = doc.window.document.querySelector('script[execute="post"]').innerHTML;
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
    return script;
} catch (error) {
    return '';
}
}
module.exports = function(doc,scope,ComponentScope,rootDir){
    ReturnStyles(doc,scope,rootDir);
    let template = doc.window.document.querySelector("template").innerHTML;
    let Postscripts = ReturnScripts(doc);
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
        child.setAttribute('onclick',`window.nijor.redirect('${route}')`);
    });
    // Compiling n:route ends here

    // Compiling on:{event} starts here
    VirtualDocument.window.document.querySelectorAll('*').forEach(child=>{
        let allAttributes = child.getAttributeNames().filter(element=>element.indexOf('on:')>-1); // Getting all the attribute names of the tag ang and filtering the attributes which start with "on:"
            allAttributes.forEach(elem=>{
                    let id;
                    let fnAttr = child.getAttribute(elem);
                    let fnargs = fnAttr.split('(');
                    let fnName = fnargs[0];
                    if(child.hasAttribute('id')){
                        id = child.getAttribute('id');
                    }else{
                        id = fnName+ComponentScope;
                        child.setAttribute('id',id);
                    }
                    let event = elem.replace('on:','');
                    let fnscripts = `
                    setTimeout(()=>{
                        document.getElementById("${id}").addEventListener("${event}",function(){
                            ${fnAttr}
                        });
                    },3);
                    `;
                    child.removeAttribute(elem);
                    let newPostscript = Postscripts+fnscripts;
                    Postscripts = newPostscript;
        });
    });
    // Compiling on:{event} ends here
    
    template = VirtualDocument.window.document.body.innerHTML;
    template = template.replace(/\s+/g,' ').trim().replace(/>\s+</g, "><");
    return {template,Postscripts};
}