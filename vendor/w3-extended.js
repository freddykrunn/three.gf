/* W3.JS 1.01 Jan 2017 by w3schools.com */
"use strict";

var w3 = {};

/**
 * hide
 */
w3.hide = function (sel) {
  w3.hideElements(w3.getElements(sel));
};

/**
 * hide elements
 */
w3.hideElements = function (elements) {
  var i, l = elements.length;
  for (i = 0; i < l; i++) {
    w3.hideElement(elements[i]);
  }
};

/**
 * hide element
 */
w3.hideElement = function (element) {
  w3.styleElement(element, "display", "none");
};

/**
 * show
 */
w3.show = function (sel, a) {
  var elements = w3.getElements(sel);
  if (a) {w3.hideElements(elements);}
  w3.showElements(elements);
};

/**
 * show elements
 * @param {*} elements 
 */
w3.showElements = function (elements) {
  var i, l = elements.length;
  for (i = 0; i < l; i++) {
    w3.showElement(elements[i]);
  }
};

/**
 * show element
 * @param {*} element 
 */
w3.showElement = function (element) {
  w3.styleElement(element, "display", "block");
};

/**
 * add style
 * @param {*} sel 
 * @param {*} prop 
 * @param {*} val 
 */
w3.addStyle = function (sel, prop, val) {
  w3.styleElements(w3.getElements(sel), prop, val);
};

/**
 * style elements
 */
w3.styleElements = function (elements, prop, val) {
  var i, l = elements.length;
  for (i = 0; i < l; i++) {    
    w3.styleElement(elements[i], prop, val);
  }
};

/**
 * style element
 * @param {*} element 
 * @param {*} prop 
 * @param {*} val 
 */
w3.styleElement = function (element, prop, val) {
  if (val == null && prop != null && Object.keys(prop).length > 0) {
    for (const p in prop) {
      element.style.setProperty(p, prop[p]);
    }
  } else {
    element.style.setProperty(prop, val);
  }
};

/**
 * toogle show
 * @param {*} sel 
 */
w3.toggleShow = function (sel) {
  var i, x = w3.getElements(sel), l = x.length;
  for (i = 0; i < l; i++) {    
    if (x[i].style.display == "none") {
      w3.styleElement(x[i], "display", "block");
    } else {
      w3.styleElement(x[i], "display", "none");
    }
  }
};

/**
 * add class
 * @param {*} sel 
 * @param {*} name 
 */
w3.addClass = function (sel, name) {
  w3.addClassElements(w3.getElements(sel), name);
};

/**
 * add class to elements
 * @param {*} elements 
 * @param {*} name 
 */
w3.addClassElements = function (elements, name) {
  var i, l = elements.length;
  for (i = 0; i < l; i++) {
    w3.addClassElement(elements[i], name);
  }
};

/**
 * add class to element
 * @param {*} element 
 * @param {*} name 
 */
w3.addClassElement = function (element, name) {
  var i, arr1, arr2;
  arr1 = element.className.split(" ");
  arr2 = name.split(" ");
  for (i = 0; i < arr2.length; i++) {
    if (arr1.indexOf(arr2[i]) == -1) {element.className += " " + arr2[i];}
  }
};

/**
 * remove class
 * @param {*} sel 
 * @param {*} name 
 */
w3.removeClass = function (sel, name) {
  w3.removeClassElements(w3.getElements(sel), name);
};

/**
 * remove class elements
 * @param {*} elements 
 * @param {*} name 
 */
w3.removeClassElements = function (elements, name) {
  var i, l = elements.length, arr1, arr2, j;
  for (i = 0; i < l; i++) {
    w3.removeClassElement(elements[i], name);
  }
};

/**
 * remove class element
 * @param {*} element 
 * @param {*} name 
 */
w3.removeClassElement = function (element, name) {
  var i, arr1, arr2;
  arr1 = element.className.split(" ");
  arr2 = name.split(" ");
  for (i = 0; i < arr2.length; i++) {
    while (arr1.indexOf(arr2[i]) > -1) {
      arr1.splice(arr1.indexOf(arr2[i]), 1);     
    }
  }
  element.className = arr1.join(" ");
};

/**
 * toogle class
 * @param {*} sel 
 * @param {*} c1 
 * @param {*} c2 
 */
w3.toggleClass = function (sel, c1, c2) {
  w3.toggleClassElements(w3.getElements(sel), c1, c2);
};

/**
 * toogle class elements
 */
w3.toggleClassElements = function (elements, c1, c2) {
  var i, l = elements.length;
  for (i = 0; i < l; i++) {    
    w3.toggleClassElement(elements[i], c1, c2);
  }
};

/**
 * toggle class element
 */
w3.toggleClassElement = function (element, c1, c2) {
  var t1, t2, t1Arr, t2Arr, j, arr, allPresent;
  t1 = (c1 || "");
  t2 = (c2 || "");
  t1Arr = t1.split(" ");
  t2Arr = t2.split(" ");
  arr = element.className.split(" ");
  if (t2Arr.length == 0) {
    allPresent = true;
    for (j = 0; j < t1Arr.length; j++) {
      if (arr.indexOf(t1Arr[j]) == -1) {allPresent = false;}
    }
    if (allPresent) {
      w3.removeClassElement(element, t1);
    } else {
      w3.addClassElement(element, t1);
    }
  } else {
    allPresent = true;
    for (j = 0; j < t1Arr.length; j++) {
      if (arr.indexOf(t1Arr[j]) == -1) {allPresent = false;}
    }
    if (allPresent) {
      w3.removeClassElement(element, t1);
      w3.addClassElement(element, t2);          
    } else {
      w3.removeClassElement(element, t2);        
      w3.addClassElement(element, t1);
    }
  }
};

/**
 * Set element inner html
 */
w3.setInnerHTML = function(selector, html) {
  var element = w3.getElement(selector);
  if (element != null) {
    element.innerHTML = html;
  }
}

/**
 * get elements
 * @param {*} id 
 */
w3.getElements = function (id) {
  if (typeof id == "object") {
    return [id];
  } else {
    return document.querySelectorAll(id);
  }
};

/**
 * get element
 * @param {*} id 
 */
w3.getElement = function (id) {
    if (typeof id == "object") {
      return id;
    } else {
      return document.querySelector(id);
    }
  };

/**
 * filter HTML
 * @param {*} id 
 * @param {*} sel 
 * @param {*} filter 
 */
w3.filterHTML = function(id, sel, filter) {
  var a, b, c, i, ii, iii, hit;
  a = w3.getElements(id);
  for (i = 0; i < a.length; i++) {
    b = w3.getElements(sel);
    for (ii = 0; ii < b.length; ii++) {
      hit = 0;
      if (b[ii].innerHTML.toUpperCase().indexOf(filter.toUpperCase()) > -1) {
        hit = 1;
      }
      c = b[ii].getElementsByTagName("*");
      for (iii = 0; iii < c.length; iii++) {
        if (c[iii].innerHTML.toUpperCase().indexOf(filter.toUpperCase()) > -1) {
          hit = 1;
        }
      }
      if (hit == 1) {
        b[ii].style.display = "";
      } else {
        b[ii].style.display = "none";
      }
    }
  }
};

/**
 * sort HTML
 * @param {*} id 
 * @param {*} sel 
 * @param {*} sortvalue 
 */
w3.sortHTML = function(id, sel, sortvalue) {
  var a, b, i, ii, y, bytt, v1, v2, cc, j;
  a = w3.getElements(id);
  for (i = 0; i < a.length; i++) {
    for (j = 0; j < 2; j++) {
      cc = 0;
      y = 1;
      while (y == 1) {
        y = 0;
        b = a[i].querySelectorAll(sel);
        for (ii = 0; ii < (b.length - 1); ii++) {
          bytt = 0;
          if (sortvalue) {
            v1 = b[ii].querySelector(sortvalue).innerHTML.toLowerCase();
            v2 = b[ii + 1].querySelector(sortvalue).innerHTML.toLowerCase();
          } else {
            v1 = b[ii].innerHTML.toLowerCase();
            v2 = b[ii + 1].innerHTML.toLowerCase();
          }
          if ((j == 0 && (v1 > v2)) || (j == 1 && (v1 < v2))) {
            bytt = 1;
            break;
          }
        }
        if (bytt == 1) {
          b[ii].parentNode.insertBefore(b[ii + 1], b[ii]);
          y = 1;
          cc++;
        }
      }
      if (cc > 0) {break;}
    }
  }
};

/**
 * slideshow
 * @param {*} sel 
 * @param {*} ms 
 * @param {*} func 
 */
w3.slideshow = function (sel, ms, func) {
  var i, ss, x = w3.getElements(sel), l = x.length;
  ss = {};
  ss.current = 1;
  ss.x = x;
  ss.ondisplaychange = func;
  if (!isNaN(ms) || ms == 0) {
    ss.milliseconds = ms;
  } else {
    ss.milliseconds = 1000;
  }
  ss.start = function() {
    ss.display(ss.current)
    if (ss.ondisplaychange) {ss.ondisplaychange();}
    if (ss.milliseconds > 0) {
      window.clearTimeout(ss.timeout);
      ss.timeout = window.setTimeout(ss.next, ss.milliseconds);
    }
  };
  ss.next = function() {
    ss.current += 1;
    if (ss.current > ss.x.length) {ss.current = 1;}
    ss.start();
  };
  ss.previous = function() {
    ss.current -= 1;
    if (ss.current < 1) {ss.current = ss.x.length;}
    ss.start();
  };
  ss.display = function (n) {
    w3.styleElements(ss.x, "display", "none");
    w3.styleElement(ss.x[n - 1], "display", "block");
  }
  ss.start();
  return ss;
};

/**
 * include HTML
 */
w3.includeHTML = function() {
  var z, i, elmnt, file, xhttp;
  z = document.getElementsByTagName("*");
  for (i = 0; i < z.length; i++) {
    elmnt = z[i];
    file = elmnt.getAttribute("w3-include-html");
    if (file) {
      xhttp = new XMLHttpRequest();
      xhttp.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
          elmnt.innerHTML = this.responseText;
          elmnt.removeAttribute("w3-include-html");
          w3.includeHTML();
        }
      }      
      xhttp.open("GET", file, true);
      xhttp.send();
      return;
    }
  }
};

/**
 * get Http Data
 * @param {*} file 
 * @param {*} func 
 */
w3.getHttpData = function (file, func) {
  w3.http(file, function () {
    if (this.readyState == 4 && this.status == 200) {
      func(this.responseText);
    }
  });
};

/**
 * get Http Object
 * @param {*} file 
 * @param {*} func 
 */
w3.getHttpObject = function (file, func) {
  w3.http(file, function () {
    if (this.readyState == 4 && this.status == 200) {
      func(JSON.parse(this.responseText));
    }
  });
};

/**
 * display Http
 * @param {*} id 
 * @param {*} file 
 */
w3.displayHttp = function (id, file) {
  w3.http(file, function () {
    if (this.readyState == 4 && this.status == 200) {
      w3.displayObject(id, JSON.parse(this.responseText));
    }
  });
};

/**
 * http
 * @param {*} target 
 * @param {*} readyfunc 
 * @param {*} xml 
 * @param {*} method 
 */
w3.http = function (target, readyfunc, xml, method) {
  var httpObj;
  if (!method) {method = "GET"; }
  if (window.XMLHttpRequest) {
    httpObj = new XMLHttpRequest();
  } else if (window.ActiveXObject) {
    httpObj = new ActiveXObject("Microsoft.XMLHTTP");
  }
  if (httpObj) {
    if (readyfunc) {httpObj.onreadystatechange = readyfunc;}
    httpObj.open(method, target, true);
    httpObj.send(xml);
  }
};

/**
 * get elements by attribute
 * @param {*} x 
 * @param {*} att 
 */
w3.getElementsByAttribute = function (x, att) {
  var arr = [], arrCount = -1, i, l, y = x.getElementsByTagName("*"), z = att.toUpperCase();
  l = y.length;
  for (i = -1; i < l; i += 1) {
    if (i == -1) {y[i] = x;}
    if (y[i].getAttribute(z) !== null) {arrCount += 1; arr[arrCount] = y[i];}
  }
  return arr;
};  
w3.dataObject = {},

/**
 * display object
 * @param {*} selector 
 * @param {*} data 
 */
w3.displayObject = function (selector, data, notInDOM) {
  var htmlObj, htmlTemplate, html, arr = [], a, l, rowClone, x, j, i, ii, cc, res, src, repeat, repeatObj, repeatX = "";
  // get element
  if (typeof(selector) === "string") {
    htmlObj = document.querySelector(id);
  } else {
    htmlObj = selector
  }

  // init template
  if (notInDOM == null || notInDOM == false) {
    htmlTemplate = init_template(id, htmlObj);
    html = htmlTemplate.cloneNode(true);
  } else {
    html = htmlObj;
  }

  // render w3-repeat elements
  // arr = w3.getElementsByAttribute(html, "w3-repeat");
  // l = arr.length;
  // for (j = (l - 1); j >= 0; j -= 1) {
  //   cc = arr[j].getAttribute("w3-repeat").split(" ");
  //   if (cc.length == 1) {
  //     repeat = cc[0];
  //   } else {
  //     repeatX = cc[0];
  //     repeat = cc[2];
  //   }
  //   arr[j].removeAttribute("w3-repeat");
  //   repeatObj = data[repeat];
  //   if (repeatObj && typeof repeatObj == "object" && repeatObj.length != "undefined") {
  //     i = 0;
  //     for (x in repeatObj) {
  //       i += 1;
  //       rowClone = arr[j];
  //       rowClone = w3_replace_curly(rowClone, "element", repeatX, repeatObj[x]);
  //       a = rowClone.attributes;
  //       for (ii = 0; ii < a.length; ii += 1) {
  //         a[ii].value = w3_replace_curly(a[ii], "attribute", repeatX, repeatObj[x]).value;
  //       }
  //       (i === repeatObj.length) ? arr[j].parentNode.replaceChild(rowClone, arr[j]) : arr[j].parentNode.insertBefore(rowClone, arr[j]);
  //     }
  //   } else {
  //     console.log("w3-repeat must be an array. " + repeat + " is not an array.");
  //     continue;
  //   }
  // }

  // render w3-if elements
  arr = w3.getElementsByAttribute(html, "w3-if");
  l = arr.length;
  for (j = (l - 1); j >= 0; j -= 1) {
    src = arr[j].getAttribute("w3-if");
    try {
      res = window.eval.call(window,'(function (data) { return '+src+'})')(data);
    } catch(ex) {
      res = false;
    }
    if (res === true || res === 1) {
      arr[j].style.display = "initial";
    } else {
      arr[j].style.display = "none";
    }
    arr[j].removeAttribute("w3-if");
  }

  // replace all curly elements
  html = w3_replace_curly(html, "element");

  // replace html content
  htmlObj.parentNode.replaceChild(html, htmlObj);


  /**
   * Init template
   * @param {*} id 
   * @param {*} obj 
   */
  function init_template(id, obj) {
    var template;
    template = obj.cloneNode(true);
    if (w3.dataObject.hasOwnProperty(id)) {return w3.dataObject[id];}
    w3.dataObject[id] = template;
    return template;
  }

  /**
   * Replace curly
   * @param {*} elmnt 
   * @param {*} typ 
   * @param {*} repeatX 
   * @param {*} x 
   */
  function w3_replace_curly(elmnt, typ, repeatX, x) {
    var value, rowClone, pos1, pos2, originalHTML, lookFor, lookForARR = [], i, cc, r;
    rowClone = elmnt.cloneNode(true);
    pos1 = 0;
    while (pos1 > -1) {
      originalHTML = (typ == "attribute") ? rowClone.value : rowClone.innerHTML;
      pos1 = originalHTML.indexOf("{{", pos1);
      if (pos1 === -1) {break;}
      pos2 = originalHTML.indexOf("}}", pos1 + 1);
      lookFor = originalHTML.substring(pos1 + 2, pos2);
      lookForARR = lookFor.split("||");
      value = undefined;
      for (i = 0; i < lookForARR.length; i += 1) {
        lookForARR[i] = lookForARR[i].replace(/^\s+|\s+$/gm, ''); //trim
        if (x) {value = x[lookForARR[i]];}
        if (value == undefined && data) {value = data[lookForARR[i]];}
        if (value == undefined) {
          cc = lookForARR[i].split(".");
          if (cc[0] == repeatX) {value = x[cc[1]]; }
        }
        if (value == undefined) {
          if (lookForARR[i] == repeatX) {value = x;}
        }
        if (value == undefined) {
          if (lookForARR[i].substr(0, 1) == '"') {
            value = lookForARR[i].replace(/"/g, "");
          } else if (lookForARR[i].substr(0,1) == "'") {
            value = lookForARR[i].replace(/'/g, "");
          }
        }
        if (value != undefined) {break;}
      }
      if (value != undefined) {
        r = "{{" + lookFor + "}}";
        if (typ == "attribute") {
          rowClone.value = rowClone.value.replace(r, value);
        } else {
          w3_replace_html(rowClone, r, value);
        }
      }
      pos1 = pos1 + 1;
    }
    return rowClone;
  }

  /**
   * Replace HTML
   * @param {*} a 
   * @param {*} r 
   * @param {*} result 
   */
  function w3_replace_html(a, r, result) {
    var b, l, i, a, x, j;
    if (a.hasAttributes()) {
      b = a.attributes;
      l = b.length;
      for (i = 0; i < l; i += 1) {
        if (b[i].value.indexOf(r) > -1) {b[i].value = b[i].value.replace(r, result);}
      }
    }
    x = a.getElementsByTagName("*");
    l = x.length;
    a.innerHTML = a.innerHTML.replace(r, result);
  }
};

/**
 * Repeat template
 * @param {*} hostSelector 
 * @param {*} array 
 * @param {*} template 
 */
w3.repeatTemplate  = function(hostSelector, array, template, instance){
  if (array != null) {
    var host = document.querySelector(hostSelector);
    var newElement, attributes, i, componentPath, templateHTML;
    if (host != null) {
      host.innerHTML = "";
      for (i=0; i<array.length; i++) {
        // replace curly
        componentPath = `w3.components['${instance.instanceId}']`;
        templateHTML = replaceCurlyOnString(template, array[i], "item", componentPath);
        // append string to host inner html
        host.innerHTML += templateHTML;
      }
    }
  }
};

// =======
// CUSTOM
// =======

/**
 * Components
 */
w3.components = {};
w3.services = {};

function replaceCurlyOnString(htmlString, data, dataName, instance) {
  var pos1, pos2, value, curly, valueText, resultString = new String(htmlString);
  pos1 = 0;
  while (pos1 > -1) {
    pos1 = resultString.indexOf("{{", pos1);
    if (pos1 === -1) {break;}
    pos2 = resultString.indexOf("}}", pos1 + 1);
    valueText = resultString.substring(pos1 + 2, pos2);

    if (valueText != undefined) {
      curly = "{{" + valueText + "}}";
      value = window.eval.call(window,`(function (${dataName}, instance) { return ${valueText};})`)(data, instance);
      resultString = resultString.replace(curly, value);
    }
    pos1 = pos1 + 1;
  }
  return resultString;
}

function camelize(str) {
    return str.replace(/(?:^\w|[A-Z]|\b\w)/g, function(letter, index) {
        return letter.toUpperCase();
    }).replace(/\s+/g, '');
}
function displayComponentHTML(el, path, bag, pathSplitted) {
    return new Promise(function(resolve, reject) {
        w3.http(path + ".html", function(){
          if (this.readyState == 4 && this.status == 200) {
            // set view
            el.innerHTML = this.responseText;
            
            // instantiate component
            var componentName = camelize(pathSplitted[pathSplitted.length-1]);
            var instanceId = componentName + "_" + Math.round(Date.now() * Math.random())+"";        
            
            var componentInstance = eval("new "+componentName+"()");
            componentInstance.instanceId = instanceId;
            // provide existing services for the component
            componentInstance.services = w3.services;
            w3.components[instanceId] = componentInstance;
            el.setAttribute("w3-component-id", instanceId);

            componentInstance.bag = bag;
            componentInstance.init();

            setTimeout(() => {
              componentInstance.afterViewInit();
            });

            resolve(componentInstance);
          }
        });
    });
}
function loadScriptFile(pathToScript, path, pathSplitted) {
  return new Promise(function(resolve, reject) {
    try {
      var found = false;
      for (const child of document.head.children) {
          if (child.nodeName.toLowerCase() === "script") {
              if (child.getAttribute("src") === path + ".js") {
                  found = true;
                  break;
              }
          }
      }

      if (found === true) {
          resolve();
      } else {
          var script = document.createElement('script');
          script.onload = function () {
            resolve();
          };
          script.src = path + ".js";
          script.type = 'text/javascript';
          document.head.appendChild(script);
      }
    } catch (ex) {
      console.error("Error loading component script '"+pathToScript+"'");
      reject(ex);
    }
  });
}
function loadStylesheetFile(pathToScript, path, pathSplitted) {
  return new Promise(function(resolve, reject) {
    var href = path + ".css";
    try {
      var found = false;
      for(var i = 0; i < document.styleSheets.length; i++){
          if(document.styleSheets[i].href == href){
              found = true;
              break;
          }
      }

      if (found === true) {
          resolve();
      } else {
          var head  = document.getElementsByTagName('head')[0];
          var link = document.createElement('link');
          link.href = href;
          link.rel = "stylesheet";
          link.type = 'text/css';
          head.appendChild(link);
          resolve();
      }
    } catch (ex) {
      console.error("Error loading component stylesheet '"+href+"'");
      reject(ex);
    }
  });
}

/**
 * Import script
 */
w3.import = function(pathToScript) {
  const pathSplitted = pathToScript.split("/");
  const path = "src/" + pathToScript;
  return loadScriptFile(pathToScript, path, pathSplitted);
}

/**
 * Provide a service
 * @param {string} servicePath 
 */
w3.provideService = function(servicePath) {
  var pathSplitted = servicePath.split("/");
  var serviceName = camelize(pathSplitted[pathSplitted.length-1]);

  if (w3.services[serviceName] == null) {
    return new Promise(function(resolve, reject) {
      const path = "src/" + servicePath;
      loadScriptFile(servicePath, path, pathSplitted).then(() => {
        // instantiate service
        var serviceInstance = eval("new "+serviceName+"()");
        w3.services[serviceName] = serviceInstance;
        w3.services[serviceName].services = w3.services;
        resolve(w3.services[serviceName]);
      }).catch((err) => {
        console.error("Error instantiate service '"+serviceName+"'");
        console.log(err);
        reject("Could not instantiate service");
      });
    });
  } else {
    return Promise.resolve(w3.services[serviceName]);
  }
}

/**
 * display component
 * @param {*} hostElementSelector 
 * @param {*} componentPath 
 */
w3.displayComponent = function(hostElementSelector, componentPath, bag) {
    const el = w3.getElement(hostElementSelector);
    const elPreviousInnerHTML = el.innerHTML;
    const pathSplitted = componentPath.split("/");

    return new Promise(function(resolve, reject) {
      const path = "src/" + componentPath + "/" + pathSplitted[pathSplitted.length-1];
      // script
      return loadScriptFile(componentPath, path, pathSplitted).then(() => {
        // stylesheet
        return loadStylesheetFile(componentPath, path, pathSplitted).then(() => {
          // display html
          displayComponentHTML(el, path, bag, pathSplitted).then((instance) => {
            resolve(instance);
          });
        });
      }).catch((err) => {
        el.includeHTML = elPreviousInnerHTML;
        console.error("Error instantiate component '"+componentPath+"'");
        throw err;
      });
    });
}

/**
 * destroy component
 * @param {*} componentInstance 
 */
w3.destroyComponent = function(componentInstance) {
  if (componentInstance != null) {
    var instance = w3.components[componentInstance.instanceId];
    if (instance != null) {
      instance.destroy();
      w3.components[componentInstance.instanceId] = null;
      var el = document.querySelector("[w3-component-id="+instance.instanceId+"]");
      if (el != null) {
        el.innerHTML = "";
      }
    }
  }
}

/**
 * Base component
 */
class BaseComponent {

    constructor() {
        this.instanceId = -1;
        this.services = {};
        this.data = {};
        this.view = w3;
    }

    provideService(servicePath) {
      return this.view.provideService(servicePath);
    }

    displayComponent(hostElement, componentPath, propertyToHoldComponentInstance, bag) {
      return this.view.displayComponent(hostElement, componentPath, bag).then((instance) => {
          this[propertyToHoldComponentInstance] = instance;
          return instance;
      })
    }

    destroyComponent(componentInstance) {
      this.view.destroyComponent(componentInstance);
    }

    init() {
    }

    afterViewInit() {
    }

    destroy() {  
    }
}