const fs = require('fs');
const path = require('path');
const sass = require('sass');
function ReturnStyles(doc,scope,rootDir){
    try {
        let style = doc.window.document.getElementsByTagName('style')[0].innerHTML;
        let cssStyle = sass.renderSync({
            data:style,
            outputStyle:'compressed'
        });
        style = cssStyle.css.toString();
        let cssSelectorRegex = /([^\r\n,{}]+)(,(?=[^}]*{)|\s*{)/g;
        let cssSelectors = style.match(cssSelectorRegex);
        try {
            cssSelectors.forEach(child=>{
                if(child.indexOf('[n-scope')==-1){
                    let sub = child.split(' ');
                    for(let i in sub){
                        if(sub[i].lastIndexOf('{')>-1){
                            sub[i] = sub[i].replace('{',`[n-scope="${scope}"]{`);
                        }else if(sub[i].lastIndexOf(',')>-1){
                            sub[i] = sub[i].replace(',',`[n-scope="${scope}"],`);
                        }else{
                            sub[i] = `${sub[i]}[n-scope="${scope}"]`;
                        }
                    }
                    newchild = sub.join(' ');
                    style = style.replace(child,newchild);
                }
            });
        } catch (error) {}
        fs.appendFileSync(path.join(rootDir,'app/static/style.css'),style);
    } catch (error) {}
}
module.exports = ReturnStyles;