/*
  Copyright 2010-2017 BusinessCode GmbH, Germany

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

  http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/
/**
 * @fileoverview
 * This file is used by JSDoc to generate API stubs
 * It tries to optimize auto-suggest and type tooltip help in Eclipse Mars I JSDT editor, criteria are:
 * - editor autosuggests nested bcdui. types with comment
 * - editor autosuggests methods of these types with comment
 * - tooltip works on constructor and on methods
 * - no global object without package (like SimpleModel) is autosuggested on new
 * - for both above, the type header is no to wired (current solution is not perfect here)
 * - The methods in autosuggest indicate where they come from (current solution is not perfect here)
 */
var os = require('os')
var fs = require('jsdoc/fs');
var helper = require('jsdoc/util/templateHelper');

exports.publish = function(taffyData, opts, tutorials) 
{

  // Debug helper
  //console.log( JSON.stringify( taffyData({longname: "bcdui.component.chart"}).get() ) );

  // Namespaces and static functions
  var result = printNamespaces( taffyData, opts );

  var allClasses = find( taffyData, { kind: "class", access: { "!is": "private" }, virtual: { "!is": true } } );

  // We want the definitions to follow the order in bcduiLoader.js
  // So we loop over the files there and find the matching classes
  // Further, for windows, we first normalize the path separator to /
  var jsFiles = opts.query.files.split(",");
  allClasses.forEach( function(clazz){
    clazz.meta.bcdFullJsPath = clazz.meta.path.replace(/\\/g,'/')+'/'+clazz.meta.filename
  });
  jsFiles.forEach( function(jsFile) {
    // Find all classs in the current file
    var groupClasses = allClasses.filter( function(clazz) {
      return clazz.meta.bcdFullJsPath.indexOf(jsFile) !== -1;
    });
    // Print classes
    groupClasses.forEach( function(clazz, clazzIdx) {
      result += printClass( taffyData, clazz );
    }); // class
  });

  // Hiding local symbols
  result = "// This file contains BCD-UI Javascript Api stubs for IDE autosuggest"+ newLine + result + newLine;

  fs.mkPath(opts.destination);
  fs.writeFileSync(opts.destination+"/bcduiApiStubs.js", result, 'utf8')

}

/**
 * Print a class docu block
 * @param taffyData
 * @param clazz
 * @returns {String}
 */
function printClass( taffyData, clazz )
{
  
  var result = "";
  result += "/*"+newLine;
  result += "  "+clazz.alias+newLine;
  result += " */"+newLine;

  // This dummy has to come before the clazz comment and it has to have the same name as the member (without the package)
  // Eclipse does not recognize prototype extension on nested objects, that's why we put them on this global object first
  var tempAlias = clazz.name;

  // Print the comment.
  // Class related
  result += newLine+"/**"+newLine;
  result += "<p><b>@see</b> <a href='https://businesscode.github.io/BCD-UI-Docu/jsdoc/"+clazz.longname+".html'>Online help</a></p>"+newLine;
  if( clazz.classdesc )
    result += "<b>@classdesc</b>"+newLine+multilineStringToTable(clazz.classdesc);
  if( clazz.description )
    result += "<b>@description</b>"+newLine+multilineStringToTable(clazz.description);
  result += printCommentParamsAsTable( clazz.params, clazz, "Constructor" );

  if( clazz.virtual )
    result += "<b>@abstract</b> Use a concrete subclass"+newLine; // Wired enough, Eclipse needs a random string here to not treat the next tag as its content
  if( clazz.augments )
    clazz.augments.forEach( function(aug) { result+="<b>@extends</b> "+aug+"<p/>"+newLine } );
  if( clazz.deprecated )
    result += "<b>@deprecated</b> " + clazz.deprecated+"<p/>"+newLine;
  result += printCommentExamplesMandatories( clazz, clazz );
  result += printCommentExamples( clazz.examples, clazz, "Constructor" );
  result += printCommentParams( clazz.params, clazz, "Constructor" );
  result += " */"+newLine;

  // Assignment to name with package is needed for Eclipse auto-suggest and for tooltip of functions
  // Assignment to short name is necessary for Eclipse fly-over on constructor and the type-name for the methods
  result += clazz.alias+" = function(";
  if( clazz.params ) {
    clazz.params.filter(function(param){
      if( param.name )
        return param.name.indexOf(".")===-1;
      console.warn("Missing param name for constructor of "+clazz.longname);
        return false;
    }).forEach( function(param, paramIdx) {
      result += paramIdx > 0 ? ", " : " ";
      result += param.name;
    });
    result += " ";
  }
  result += "){};"+newLine;
  if( clazz.augments )
    result += clazz.alias+".prototype = Object.create("+clazz.augments+".prototype);"+newLine;

  result += clazz.alias+".prototype.constructor = "+clazz.alias+";"+newLine+newLine;

  // Now print the methods
  var methods = find(taffyData,{ kind: "function", memberof: clazz.longname });
  methods = methods.filter( function(m){ return m.access !== "private" } );
  methods.sort( function(m1, m2){ return m1.name > m2.name } );

  var ownMethods = methods.filter( function(m){ return !m.inherits } );
  ownMethods.forEach( function(method, methodIdx) {
    result += printMethod(method, methodIdx, clazz, tempAlias)
  });

  // TODO note in comment that the method is inherited
  var inheritedMethods = methods.filter( function(m){ return !!m.inherits && ownMethods.filter(om => om.name === m.name).length === 0 } );
  if( inheritedMethods.length > 0 ) {
    result += "//------------------"+newLine;
    result += "// Inherited Methods"+newLine+newLine;
  }
  inheritedMethods.forEach( function(method, methodIdx) {
    result += printMethod(method, methodIdx, clazz, tempAlias )
  });

  result += printProperties( taffyData, clazz.longname );

  return result;
}

/**
 * Eclipse (oxygen with tern) and IDEA (2012.2) have issues with new lines
 * Eclipse tends to ignore the rest of the comment and IDEA ignores the newlines themselves
 * To make comments better to read, we turn them into a table with rows for each new line
 * if they span multiple lines and don't contain table, ol, ul or dl tags to keep their formatting
 * @param text
 * @returns {*}
 */
function multilineStringToTable(text)
{
  if( !text )
    return "";
  if( text.indexOf("</table") === -1 && text.indexOf("</ol") === -1 && text.indexOf("</ul") === -1 && text.indexOf("</dl") === -1
      && (text.indexOf("\n") !== -1 || text.indexOf("\r") !== -1) ) {
    text =  stringCleaner( text );
    var result = "<table border='0' cellspacing='0' cellpadding='0'><tr><td>" + newLine;
    result += text.replace(/\r?\n|\r/g,"</td></tr><tr><td>") + newLine;
    result += "</td></tr></table>" + newLine;
    return result;
  } else
    return stringCleaner( text, true ) + newLine;
}

/**
 * Eclipse Oxygen+Tern have issues with a point followed by a single space and leading spaces. Everything after that tends to be ignored.
 * Also they have issues with new lines in JSDoc text, text can be turned in a one-liner, if needed
 * @param text
 */
function stringCleaner( text, makeOneLiner )
{
  if( makeOneLiner )
    text = text.replace(/(\r?\n|\r)/gm,"");
  return text.replace(/^(\r?\n|\r)/gm,"").replace(/\. /g,".  ").replace(/^ +/gm,"");
}

/**
 * Print a method docu block
 * @param method
 * @param methodIdx
 * @param clazz
 * @returns {String}
 */
function printMethod(method, methodIdx, clazz, tempAlias) 
{
  var result = "/**"+newLine;
  // Eclipse (oxygen, tern), wants us to start with the description
  // They also fail if the are new lines in the cell and the also want two spaces after a sentence dot
  result += "<p><b>@see</b> <a href='https://businesscode.github.io/BCD-UI-Docu/jsdoc/"+clazz.longname+".html#"+(method.scope==="static"?".":"")+method.name+"'>Online help</a></p>"+newLine;
  result += "<b>@description</b>"+newLine;
  result += multilineStringToTable(method.description);
  // IDEA (2012.2) needs @method (to show type) and @memberOf (to understand it belongs to the class)
  result += printCommentParamsAsTable( method.params, clazz, method );
  result += "<table border='0' cellpadding=\"0\" cellspacing=\"0\">";
  result += "<tr><td><b>@method</b> "+method.name+"</td></tr>"+newLine;
  result += "<tr><td><b>@memberOf</b> "+clazz.longname+(method.scope!=="static" ? ".prototype" : "")+"</td></tr>"+newLine;
  if( method.virtual )
    result += "<tr><td><b>@abstract</b> Use a concrete subclass</td></tr>"+newLine; // Wired enough, Eclipse needs a random string here to not indent the next tag
  if( method.inherits )
    result += "<tr><td><b>@inherits</b> "+method.inherits+"</td></tr>"+newLine;
  if( method.overrides )
    result += "<tr><td><b>@overrides</b> "+method.overrides+"</td></tr>"+newLine;
  if( method.deprecated )
    result += "<tr><td><b>@deprecated</b> "+ method.deprecated+"</td></tr>"+newLine;
  result += "</table>";
  // IDEA prefers samples before parameters
  result += printCommentExamplesMandatories( method, clazz );
  result += printCommentExamples( method.examples, clazz, method );
  // Since tern ignores the param descriptions and they are hard to read in IDEA, we also include them here in the comment as a table
  result += printCommentParams( method.params, clazz, method );

  if( method.returns ) {
    var ret = method.returns[0];
    result += "@return";
    result += printCommentDataTypes( ret.type );
    if( ret.description )
      result += " "+ret.description;
    result += newLine;
  }
  // Next row is actually evaluated by IDEA and it is not enough to have that in the able above
  result += "@memberOf "+clazz.longname+(method.scope !== "static" ? "#" : "")+""+newLine;
  result += " */"+newLine;

  // Now the Javascript code
  result += clazz.longname;
  if( method.scope !== "static" )
    result += ".prototype";
  result += "."+method.name+" = function(";
  if( method.params ) {
    method.params.filter(function(param) { 
      return param.name && param.name.indexOf(".")===-1
    }).forEach( function(param, paramIdx) {
      result += paramIdx > 0 ? ", " : " ";
      result += param.name;
    });
    result += " ";
  }
  result += "){};"+newLine+newLine;

  result += newLine;

  return result;
}

/**
 * Print the comment section for the parameters
 * TODO, in case of multiple parameter sets, keep the groups together
 * @param params
 * @param clazz
 * @param method
 * @returns {String}
 */
function printCommentParams( params, clazz, method )
{
  if( !params || params.length===0)
    return "";
  
  var result = "";
  params.forEach( function(param) {
    result += "@param";
    result += printCommentDataTypes(param.type);
    if (param.name) {
      result += " " + (param.optional ? '['+param.name+']' : param.name);
    } else
      console.warn("Missing param name at " + clazz.longname + "." + method.name);
    if (param.description)
      result += "  " + param.description;
    result += newLine;
  });

  return result;
}

/**
 * Print the comment section for the parameters as an HTML table, not as a JSDoc
 * This is very compact (name, type + descrition in one cell) fly-overoptimized
 * @param params
 * @param clazz
 * @param method
 * @returns {String}
 */
function printCommentParamsAsTable( params, clazz, method )
{
  if( !params || params.length===0)
    return "";

  var result = "<b>@parameters</b>"+newLine;
  result += "<table border='0'>" + newLine;
  params.forEach( function(param) {
    result += "<tr>";
    var paramText = param.name;
    if( param.defaultvalue )
      paramText += "=" + param.defaultvalue;
    if( param.optional )
      paramText = "["+paramText+"]";
    result += "<td>"+paramText+"</td>";
    result += "<td>"+printCommentDataTypes(param.type)+"&nbsp;&nbsp;";
    result += (param.description?stringCleaner(param.description,true):"")+"</td></tr>";
  });
  result += "</table>" + newLine;

  return result;
}


/**
 * Print a {type} or {(type1|type2)} for the comment section
 * @param type
 * @returns {String}
 */
function printCommentDataTypes( type )
{
  var result = "";
  if( type && type.names ) {
    result += " {" + (type.names.length>1 ? "(":"");
    type.names.forEach( function(pTNname, pTNnameIdx) { result += pTNnameIdx>0 ? "|" : ""; result += pTNname } );
    result += (type.names.length>1 ? ")":"") + "}";
  }
  return result;
}

/**
 * Print a sourcecode example for into the comment area
 * @param examples
 * @returns {String}
 */
function printCommentExamples( examples )
{
  var result = "";
  if( examples )
    examples.forEach( function(example) { result+=multilineStringToTable("<b>@example</b>"+newLine+example.replace(/</g, "&lt;")) } );
  return result;
}


/**
 * Create an example for JSDoc where a method is shown with exactly the mandatory parameters
 */
function printCommentExamplesMandatories( method, clazz )
{
  if( ! method.params || method.params.length < 2 )
    return "";

  // generate a sample. Eclupse needs leading spaces to show comment as a comment
  var instName = "my" + clazz.name;
  var result = "  // Sample using the mandatory parameters"+newLine;
  if( method === clazz ) {
    if( clazz.virtual )
      return "";
    result += "  var "+instName+" = new " + clazz.longname;
  } else if( method.scope !== "static" ) {
    if( method.returns )
      result += "  var ret = ";
    result += instName + "." + method.name;
  } else  {
    result += "  ";
    if( method.returns )
      result += "var ret = ";
    result += method.longname.replace("#","."); // Instance functions are separated with a # from classname in jsdoc, but her we want to see the dot
  }
  result += "(";

  var hasParamBag = method.params.some( function(p) { return p.name.indexOf(".") !== -1; } );
  
  if( hasParamBag )
    result += " {";
  method.params.filter( function(param) {
    // We do not want param bags here, only their parts
    return ! param.optional && ! (hasParamBag && param.name.split(".").length===1);
  }).forEach( function(param,paramIdx) {
    result += paramIdx > 0 ? ", " : " ";
    if( hasParamBag )
      result += param.name.split(".")[1] + ": " + param.name.split(".")[1];
    else
      result += param.name;
  });
  if( hasParamBag )
    result += " }";
  result += " );";

  return multilineStringToTable("<b>@example</b>"+newLine+result.replace(/</g, "&lt;"));
  
}

/**
 * Loop over namespaces and static functions
 */
function printNamespaces( taffyData, opts )
{
  var allNamespaces = find( taffyData, { kind: "namespace", access: { "!is": "private" }  } );
  // Make sure namespaces are defined buttom up
  allNamespaces = allNamespaces.sort( function(a,b){ return a.longname.localeCompare(b.longname) } )

  var result = "";
  allNamespaces.forEach( function( namespace ) {

    // Check for conflicting @namespace definitions
    var sameNsDefs = taffyData( { kind: "namespace", longname: namespace.longname } ).get();
    if( sameNsDefs.length > 1 ) {
      var errorMsg = namespace.longname + " was found at: ";
      sameNsDefs.forEach( function(nsDef) {
        errorMsg += "[" + nsDef.meta.filename + " line: " + nsDef.meta.lineno +"] ";
      });
      throw("namespace '" + namespace.longname + "' is defined multiple times! " + errorMsg);
    }
    
    result += "/**" + newLine;
    if( namespace.description )
      result += stringCleaner(namespace.description) + newLine;
    result += " * @namespace " + newLine;
    result += " */" + newLine;
    if( namespace.longname.indexOf(".") === -1 )
      result += "var ";
    result += namespace.longname + " = {};" + newLine + newLine;
    
    result += printProperties( taffyData, namespace.longname );

    var methods = find(taffyData,{ kind: "function", memberof: namespace.longname });
    methods = methods.filter( function(m){ return m.access !== "private" } );
    methods.sort( function(m1, m2){ return m1.name > m2.name } );
    methods.forEach ( function( method, methodIdx ) {
      result += printMethod(method, methodIdx, namespace, namespace.longname);
    })

  });

  return result;
}


/**
 * Print the properties of an object
 */
function printProperties( taffyData, containerLongname )
{
  var result = "";
  var members = taffyData( { memberof: containerLongname, access: {"!is": "private"} }, [ {kind: "member"}, {kind: "constant"} ] ).get();
  members.filter( m => m.description ).forEach( function(member) {

    if( // Wired, happens on bcdui.something[1] = x;
        member.longname.indexOf("[undefined]") !== -1
          // Skip class and namespaces, they are also show up here as kind:member, but are handled else where. 
          // And if the property shows up multiple times (init, assignment etc), it is enough to declare it private once to hide it here
        || taffyData({ longname: member.longname}, [{kind: "class"}, {kind: "namespace"}, {access: "private"}] ).count() > 0
          // If it shows up undocumented but there is a documented version, take that one
        || ( !member.description && taffyData({ longname: member.longname, description: {"isUndefined": false} } ).count() > 0 ) )
      return true;

    if( member.description ) {      
      result += "/**" + newLine;
      result += " * " + member.description + newLine;
      result += " */" + newLine;
    }

    var connect = member==="static" ? '.' : '.prototype.'; // Member are separated with a # from classname in jsdoc, but her we want to see the dot
    result += member.longname.replace("#",connect);
    if( member.meta.code.type === "NewExpression" && member.type )
      result += " = new " + member.type.names[0] + "()";
    else if( member.meta.code.type === "Literal" && member.meta.code.value && member.type && member.type.names[0].toLowerCase() === "string" )
      result += " = \"" + member.meta.code.value + "\"";
    else if( member.meta.code.type === "Literal" && parseFloat(member.meta.code.value) === parseFloat(member.meta.code.value) )
      result += " = " + member.meta.code.value;
    else
      result += " = {}"; // We need this dummy assignment for Eclipse Mars autosuggestion to work. And if we assign only null, tooltip fails
    result +=  ";"+newLine;
  });
  
  return result + newLine;
}

/*
 * Utility functions
 */
var newLine = os.EOL;
function find(taffyData, spec) {
  return helper.find(taffyData, spec);
}
