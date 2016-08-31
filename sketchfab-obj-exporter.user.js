// ==UserScript==
// @name           sketchfab-obj-exporter-1.11
// @description    lets you export Sketchfab scenes
// @author         Reinitialized
//
//Version Number
// @version        1.11
//
// Urls process this user script on
// @include        /^https?://(www\.)?sketchfab\.com/models/.*/embed.*$/
// @grant none
// ==/UserScript==

function unfreeze(obj) {
    var copy = {};
    for(var i in obj) {
       copy[i] = obj[i];
    }
    return copy;
}

var models = [];
var baseModelName = safeName(document.title.replace(' - Sketchfab', ''));
function overrideDrawImplementation() {
    var geometry = OSG.osg.Geometry;
    var newPrototype = unfreeze(geometry.prototype);
    geometry.prototype = newPrototype;
    newPrototype.originalDrawImplementation = newPrototype.drawImplementation;
    newPrototype.drawImplementation = function(a) {
        this.originalDrawImplementation(a);
        if (!this.computedOBJ) {
            this.computedOBJ = true;
            this.name = baseModelName + '-' + models.length;
            this.__defineGetter__("textures", function() {
                return this._textures ? this._textures : this._textures = textureInfoForGeometry(this);
            });
            models.push({
                name: this.name,
                geom: this,
                get obj() {
                    return OBJforGeometry(this.geom);
                },
                get mtl() {
                    return MTLforGeometry(this.geom);
                },
                get textures() {
                    return this.geom.textures;
                }
            });
        }
    };
}

// source: http://stackoverflow.com/a/8485137
function safeName(s) {
    return s.replace(/[^a-zA-Z0-9]/gi, '_').toLowerCase();
}
 
function InfoForGeometry(geom) {
    var attributes = geom.attributes;
    if (!attributes)
        throw "No attributes for geometry";
    var vertices = attributes.Vertex;
    if (!vertices)
        throw "No vertices for geometry";
    var normals = attributes.Normal;
    var texCoords = attributes.TexCoord0;
    var info = {
        'vertices' : vertices._elements,
        'normals' : normals ? normals._elements : [],
        'texCoords' : texCoords ? texCoords._elements : [],
        'primitives' : [],
        'name' : geom.name
    };
    for (i = 0; i < geom.primitives.length; ++i) {
        var primitive = geom.primitives[i];
        info.primitives.push({
            'mode' : primitive.mode,
            'indices' : primitive.indices._elements
        });
    }
    return info;
}

var verticesExported = 0;
var nl = '\n';
function OBJforGeometry(geom) {
    var obj = '';
    var info = InfoForGeometry(geom);
    obj += 'mtllib ' + MTLFilenameForGeometry(geom) + nl;
    obj += 'o ' + geom.name + nl;
    for (i = 0; i < info.vertices.length; i += 3) {
        obj += 'v ';
        for (j = 0; j < 3; ++j) {
            obj += info.vertices[i + j] + ' ';
        }
        obj += nl;
    }
    for (i = 0; i < info.normals.length; i += 3) {
        obj += 'vn ';
        for (j = 0; j < 3; ++j) {
            obj += info.normals[i + j] + ' ';
        }
        obj += nl;
    }
    for (i = 0; i < info.texCoords.length; i += 2) {
     	obj += 'vt ';
        for (j = 0; j < 2; ++j) {
            obj += info.texCoords[i + j] + ' ';
        }
        obj += nl;  
    }
    obj += 'usemtl ' + MTLNameForGeometry(geom) + nl;
    obj += 's on' + nl;
    var exist = {
        normals: info.normals.length != 0,
        texCoords: info.texCoords.length != 0,
    };
    for (i = 0; i < info.primitives.length; ++i) {
        var primitive = info.primitives[i];
        if (primitive.mode == 4 || primitive.mode == 5) {
            var isTriangleStrip = primitive.mode == 5;
            for (j = 0; j + 2 < primitive.indices.length; !isTriangleStrip ? j += 3 : ++j) {
                obj += 'f ';
                var isOddFace = j % 2 == 1;
                var order = [ 0, 1, 2];
                if (isTriangleStrip && isOddFace) 
                    order = [ 0, 2, 1];
                for (k = 0; k < 3; ++k) {
                    var faceNum = primitive.indices[j + order[k]] + 1 + verticesExported;
                    obj += faceNum;
                    if (exist.normals && !exist.texCoords) {
                         obj += '//' + faceNum;
                    }
                    else {
                        if (exist.texCoords) {
                            obj += '/' + faceNum;
                        }
                        if (exist.normals) {
                            obj += '/' + faceNum;
                        }
                    }
                    obj += ' ';
                }
                obj += nl;
            }
        }
        else {
            throw 'Primitive mode not implemented';
        }
    }
    verticesExported += info.vertices.length / 3.0;
    return obj;
}

var textureMTLMap = {
    DiffuseColor: "map_Kd",
    SpecularColor: "map_Ks",
    NormalMap : "map_bump",
    EmitColor : "map_Ke",
    AlphaMask : "map_d",
    Opacity : "map_o"
};

// source: http://stackoverflow.com/a/3820412
function baseName(str)
{
   var base = new String(str).substring(str.lastIndexOf('/') + 1); 
    if(base.lastIndexOf(".") != -1)       
        base = base.substring(0, base.lastIndexOf("."));
   return base;
}

function ext(str) {
    return str.split('.').pop();
}

function textureInfoForGeometry(geom) {
    var textureMap = [];
    if (stateset = geom.stateset) {
        if (textures = stateset.textureAttributeMapList) {
            textures.forEach(function(texture) {
                if (Texture = texture.Texture) {
                    if (object = Texture._object) {
                        if (texture = object._texture) {
                            if (imageProxy = texture._imageProxy) {
                                var textureURL = imageProxy.attributes.images[0].url;
                                var texture = {
                                    url: textureURL,
                                    type: textureMTLMap[object._channelName],
                                    ext: ext(textureURL)
                                };
                                texture.filename = textureFilename(geom, texture);
                                textureMap.push(texture);
                            }   
                        }
                    }
                }
            });
        }
    }
	return textureMap;
}

function textureFilename(geom, texture) {
    return baseName(texture.url) + '.' + texture.ext;
}

function MTLFilenameForGeometry(geom) {
 	return baseModelName + '.mtl';   
}

function MTLNameForGeometry(geom) {
 	return geom.name;
}

function MTLforGeometry(geom) {
    var mtl = '';
    mtl += 'newmtl ' + MTLNameForGeometry(geom) + nl;
    geom.textures.forEach(function(texture) {
    	mtl += texture.type + ' ' + texture.filename + nl;
    });
    return mtl;
}

// source: http://stackoverflow.com/questions/3219758/detect-changes-in-the-dom
var observeDOM = (function(){
    var MutationObserver = window.MutationObserver || window.WebKitMutationObserver,
        eventListenerSupported = window.addEventListener;

    return function(obj, callback){
        if( MutationObserver ){
            // define a new observer
            var obs = new MutationObserver(function(mutations, observer){
                if( mutations[0].addedNodes.length || mutations[0].removedNodes.length )
                    callback();
            });
            // have the observer observe foo for changes in children
            obs.observe( obj, { childList:true, subtree:true });
        }
        else if( eventListenerSupported ){
            obj.addEventListener('DOMNodeInserted', callback, false);
            obj.addEventListener('DOMNodeRemoved', callback, false);
        }
    }
})();


// source: http://stackoverflow.com/questions/10596417/is-there-a-way-to-get-element-by-xpath-in-javascript
function getElementByXpath(path) {
    return document.evaluate(path, document, null, 9, null).singleNodeValue;
}

var addedDownloadButton = false;
var downloadButtonParentXPath = "//div[@class='titlebar']";
var osgScriptElementPath = "//script[contains (@src, 'sketchfab')]";
var foundOsgScript = false;

observeDOM(document.body, function(){ 
    if (!foundOsgScript) {
    	if (osgScript = getElementByXpath(osgScriptElementPath)) { 
           overrideDrawImplementation();
           foundOsgScript = true;
    	}
    }
    if (!addedDownloadButton) {
        if (downloadButtonParent = getElementByXpath(downloadButtonParentXPath))
        {
            setTimeout(function () {
                addDownloadButton(downloadButtonParent);
            }, 2000);
	   addedDownloadButton = true;
        }
    }
});

// source: http://thiscouldbebetter.wordpress.com/2012/12/18/loading-editing-and-saving-a-text-file-in-html5-using-javascrip/
function downloadString(filename, ext, str) {
    function destroyClickedElement(event)
    {
        document.body.removeChild(event.target);
    }
    var textFileAsBlob = new Blob([str], {type:'text/plain'});
    var fileNameToSaveAs = filename + '.' + ext;
    
    var downloadLink = document.createElement("a");
    downloadLink.download = fileNameToSaveAs;
    downloadLink.innerHTML = "Download File";
    if (window.webkitURL != null)
    {
        // Chrome allows the link to be clicked
        // without actually adding it to the DOM.
        downloadLink.href = window.webkitURL.createObjectURL(textFileAsBlob);
    }
    else
    {
        // Firefox requires the link to be added to the DOM
        // before it can be clicked.
        downloadLink.href = window.URL.createObjectURL(textFileAsBlob);
        downloadLink.onclick = destroyClickedElement;
        downloadLink.style.display = "none";
        document.body.appendChild(downloadLink);
    }
    downloadLink.click();
}

var imagesDownloaded = {};
// source: http://muaz-khan.blogspot.com/2012/10/save-files-on-disk-using-javascript-or.html
function downloadFileAtURL(fileURL) {
    if (!imagesDownloaded[fileURL]) {
        imagesDownloaded[fileURL] = true;
        var save = document.createElement('a');
        save.href = fileURL;
        save.target = '_blank';
        save.download = '';
        var event = document.createEvent('Event');
        event.initEvent('click', true, true);
        save.dispatchEvent(event);
        (window.URL || window.webkitURL).revokeObjectURL(save.href);
	}
}

function downloadModels() {
    if (models.length == 0) {
    	alert("Download script failed... try refreshing the page");
        return;
    }
    var combinedOBJ = '';
    var combinedMTL = '';
    models.forEach(function(model) {
        combinedOBJ += model.obj + nl;
        combinedMTL += model.mtl + nl;
        model.textures.forEach(function(texture) {
        	downloadFileAtURL(texture.url);
        });
    });
    downloadString(baseModelName, 'obj', combinedOBJ);
    downloadString(baseModelName, 'mtl', combinedMTL);
}

function addDownloadButton(downloadButtonParent) {
    var downloadButton = document.createElement("a");
    downloadButton.setAttribute("class", "control");
    downloadButton.innerHTML = "<pre>OBJ-DOWNLOAD</pre>";
    downloadButton.addEventListener("click", downloadModels , false);
    downloadButtonParent.appendChild(downloadButton);
}
