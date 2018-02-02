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
"use strict";
/**
 * BCD-UI works with several Well-Known-Models, they can be found here
 */
bcdui.wkModels = bcdui.wkModels || new Object();


/**
 * Helper class for guiStatusEstablished construction
 * Gets only ready if you force it from outside, i.e. when cloning the guiStatus dataDoc
 * @private
 */
bcdui.core._GuiEstDataProvider = bcdui._migPjs._classCreate(bcdui.core.StaticModel, {

    initialize: function(args) {
      var isLeaf = ((typeof this.type == "undefined")  ? "" + (this.type = "bcdui.core._GuiEstDataProvider" ): "") != "";
      /** @private */
      this._lockedReadiness = true;
      /** @private */
      this._setReady = false;

      bcdui.core.StaticModel.call(this, args);
      
      if (isLeaf)
        this._checkAutoRegister();
    },
    
    /** @private */
    _unlock: function() {
      this._lockedReadiness = false;
      if (this._setReady)
        this._executeImpl();
    },

    /** @private */
    _executeImpl: function() {
      if (! this._lockedReadiness)
        bcdui.core.StaticModel.prototype._executeImpl.call(this);
      else
        this._setReady = true;
    }
  }
);

/**
 * <p>
 * This globally available status model encapsulating the state of the currently
 * visible prompts. It is usually manipulated by these prompts and many request
 * documents on the page are based on it. The guiStatus model is automatically
 * passed to every transformation on the page.
 * </p><p>
 * The guiStatus document must satisfy the XSD for the NamespaceURI:  <br/>
 *    http://www.businesscode.de/schema/bcdui/guiStatus-1.0.0
 * </p>
 * @type bcdui.core.DataProvider
 */
bcdui.wkModels.guiStatus = null;


// decode guiStatusGZ (either client or server sided, but synchron in any way)
// and make it available as string variable bcdui.unpackedGuiStatus
(function() {

  /** @private */
  bcdui.unpackedGuiStatus = null;

  var gz = bcdui.util.toQueryParams(document.URL).guiStatusGZ;
  
  if (typeof gz != "undefined" && gz != null && gz != "") {
  
   // decide if client (x, z) or server sided uncompress
   if (gz.charAt(0) == "x" || gz.charAt(0) == "z") {
     var gzModel = bcdui.core.compression.uncompressDOMDocument(gz);
     gzModel.execute();
     bcdui.unpackedGuiStatus = new XMLSerializer().serializeToString(gzModel.getData());
   }
   else {
     var response = jQuery.ajax({
       type: "GET",
       async: false,
       dataType: "xml",
       url:  bcdui.contextPath + bcdui.core.compression._zipLetURL + "?data=" + gz
     });
     if (response && response.responseText && response.responseText.replace(/<\?xml .*\?>/, "").length > 0)
       bcdui.unpackedGuiStatus = response.responseText;
   }
  }
})();

/**
 * This namespace contains functions related to BCD-UI page lifecycle management.
 * @namespace
 */
bcdui.core.lifecycle = 
/** @lends bcdui.core.lifecycle */
{

  /**
   * Takes the current guiStatus and re-invokes the current page with it
   * <code>/guiStatus:Status/guiStatus:ClientSettings</code> is removed as it only serves for temporary information
   * @param {Object} args
   * @param {boolean} [args.cleanXPath]            - Additional XPath to be cleaned from the guiStatus
   * @param {boolean} [args.validateFilters=false] - True or false whether or not to check IsValid flags of guiStatus filters
   * @param {document} [args.statusDocument=bcdui.wkModels.guiStatus] - optionally, other statusDocument than guiStatus
   */
  applyAction: function(args)
    {
      args = bcdui.factory._xmlArgs( args, bcdui.factory.validate.core._schema_applyAction_args);
      bcdui.factory.validate.jsvalidation._validateArgs(args, bcdui.factory.validate.core._schema_applyAction_args);

      args = args || { cleanXPath: null };
      args.statusDocument = args.statusDocument || bcdui.wkModels.guiStatus.getData();

      if ( typeof args.validateFilters == "undefined" ){ args.validateFilters = true;}
      bcdui.core.removeXPath(args.statusDocument, "/*/guiStatus:ClientSettings");

      if(args && args.cleanXPath != null && args.cleanXPath.length > 0){
        bcdui.core.removeXPath(args.statusDocument, args.cleanXPath);
      }

      if ( args.validateFilters == true ) {
        var node = args.statusDocument.selectSingleNode("//f:Filter//*[@isValid='false']");
        if (node != null) {
          bcdui.widget.showModalBox({ titleTranslate: "bcd_ApplyDenyTitle", messageTranslate: "bcd_ApplyDenyMessage", modalBoxType: bcdui.widget.modalBoxTypes.warning});
          return;
        }
      }

      bcdui.core.lifecycle.jumpTo(location.href, args.statusDocument);
    },

    /**
     * Jumps to another url optionally setting status document, this function is executed asynchronously.
     *
     * @param {url} href - target URL to jump to.
     * @param {document} [statusDocument] - status document to pass as guiStatusGZ parameter to href.
     */
    jumpTo: function(href, statusDocument) {
      const go = (statusDocGZ) => { // always defer
        setTimeout(function() {
          jQuery(location).attr("href", bcdui.core.setUrlParameter(href, "guiStatusGZ", statusDocGZ, false));
        });
      };
      if (statusDocument) {
        bcdui.core.compression.compressDOMDocument(statusDocument, go, false, false, function() {
          throw "status document compression failed";
        });
      } else {
        go();
      }
    },

  /**
   * Creates a bookmark entry for the current page + guiStatus
   * @param {Object} args
   * @param {Object} [args.proposedName=document.title] - Name of the bookmark
   * @param {Object} [args.cleanClientSettings=true]    - True or false whether or not to clean /guiStatus:Status/guiStatus:ClientSettings from the $guiStatus
   * @param {Object} [args.cleanXPath]                  - Additional XPath to be cleaned from the guiStatus, useful for removing current period filter for example
   *
   */
  bookmarkAction: function(args) {
    args = bcdui.factory._xmlArgs( args, bcdui.factory.validate.core._schema_bookmarkAction_args);
    bcdui.factory.validate.jsvalidation._validateArgs(args, bcdui.factory.validate.core._schema_bookmarkAction_args);

    var newGuiStatusDoc = bcdui.core.browserCompatibility.newDOMDocument();
    newGuiStatusDoc.appendChild(bcdui.wkModels.guiStatus.getData().documentElement.cloneNode(true));

    if (args && args.cleanClientSettings != 'false' && args.cleanClientSettings != false) {
      bcdui.core.removeXPath(newGuiStatusDoc, "/*/guiStatus:ClientSettings");
    }

    if(args && args.cleanXPath != null && args.cleanXPath.length > 0){
      bcdui.core.removeXPath(newGuiStatusDoc, args.cleanXPath);
    }
    if ( !args || args.proposedName == null || args.proposedName.length  == 0){
      args.proposedName = document.title;
    }

    // AddFavorite/addPanel cannot be called directly from within compressDOMDocument
    bcdui.core.compression.compressDOMDocument(newGuiStatusDoc
    , function(compressedDoc) {
        var url = location.href.replace("#", "?") + "?";
        url = url.substring(0, url.indexOf("?")) + "?";
        url += "guiStatusGZ=" + compressedDoc;
        jQuery("#bcdBookmark").remove();
        jQuery("body").append("<button style='display:none' id='bcdBookmark' name='book' type='button' value='book' onclick='bcdui.core.lifecycle._generateBookmark(\"" + args.proposedName + "\", \"" + url + "\");'/>");
        jQuery("#bcdBookmark").click();
        jQuery("#bcdBookmark").remove();
      }
    , null, true
    );
  },

  /**
   * Helper for Firefox workaround
   * @private
   */
  _generateBookmark: function(nameSuggestion, url) {
    // since FireFox 23 addPanel is not supported anymore
    // so bookmark generation seems to be limited to Internet Explorer now
    if (window.sidebar && typeof window.sidebar.addPanel != "undefined")
      window.sidebar.addPanel(nameSuggestion, url, "");
    else if (window.external && typeof window.external.AddFavorite != "undefined")
      window.external.AddFavorite(url, nameSuggestion);
    else
      setTimeout(function(){ alert("Bookmark option is not supported by your browser.\nPlease use browser specific options to create a bookmark manually."); }, 1);
  },

  switchToMainUrl: function(url) {
    window.location.href = bcdui.core.setRequestDocumentParameter(location.href, url);
  },

  /**
   * @private
   */
  _constructGuiStatus: function()
    {
      var data = (bcdui.browserCompatibility.isMobileSafari || bcdui.browserCompatibility.isWebKit)
               ? "<guiStatus:Status xmlns:guiStatus=\"" + bcdui.core.xmlConstants.namespaces.guiStatus + "\"/>"
               : "<Status xmlns=\"" + bcdui.core.xmlConstants.namespaces.guiStatus + "\"/>";

      if (bcdui.wkModels.guiStatus != null) return;

      var currentStatusGZ = bcdui.core.getUrlParameter(location.href, bcdui.core._requestDocumentParameterName, null);
      
      if (currentStatusGZ == null || currentStatusGZ == "") {
        bcdui.wkModels.guiStatus = new bcdui.core.StaticModel({ id: "guiStatus", data: data });
      }
      else if (bcdui.unpackedGuiStatus == null) {
        bcdui.wkModels.guiStatus = new bcdui.core.StaticModel({ id: "guiStatus", data: data });
        bcdui.factory.objectRegistry.withReadyObjects(["bcdI18nModel"], function() {
          bcdui.widget.showModalBox({
            titleTranslate: "bcd_ExpiredURLTitle"
          , messageTranslate: "bcd_ExpiredURL"
          , modalBoxType: bcdui.widget.modalBoxTypes.error
          , onclick: "bcdui.core.lifecycle.switchToMainUrl()"
          });
        });
        return;
      }
      else {
        bcdui.wkModels.guiStatus = new bcdui.core.StaticModel({ id: "guiStatus", data: bcdui.unpackedGuiStatus });
      }

      bcdui.wkModels.bcdNavPath = new bcdui.core.StaticModel({ id: "bcdNavPath", data: 
        (bcdui.browserCompatibility.isMobileSafari || bcdui.browserCompatibility.isWebKit)
        ? "<guiStatus:NavPaths xmlns:guiStatus=\"" + bcdui.core.xmlConstants.namespaces.guiStatus + "\"/>"
        : "<NavPaths xmlns=\"" + bcdui.core.xmlConstants.namespaces.guiStatus + "\"/>"
      });
      bcdui.wkModels.bcdNavPath.execute();

      // construct guiStatusEstablished by cloning the guiStatus dataDoc when it gets ready
      // bcdui.wkModels.guiStatusEstablished does not get ready until we force it
      bcdui.wkModels.guiStatusEstablished = new bcdui.core._GuiEstDataProvider({id: "guiStatusEstablished", data: data});
      bcdui.wkModels.guiStatus.addStatusListener({
        status:  bcdui.wkModels.guiStatus.getReadyStatus(),
        onlyOnce: true,
        listener: function() {
          // clone current guiStatus data and allow readiness/execution
          // using a browser non-specific way of cloning the data by serializing it  
          bcdui.wkModels.guiStatusEstablished.dataDoc = bcdui.core.browserCompatibility.createDOMFromXmlString( new XMLSerializer().serializeToString(bcdui.wkModels.guiStatus.getData()), "");
          bcdui.wkModels.guiStatusEstablished._unlock();
        }.bind(this)
      });

      /*
       * Deferred execution is required to support modelUpdaters on the page to be added to the
       * guiStatus before it becomes ready.
       */
      bcdui.core.ready(bcdui.wkModels.guiStatus.execute.bind(bcdui.wkModels.guiStatus));
    }

}; // namespace

bcdui.core.lifecycle._constructGuiStatus();

// Declare well known models. Data is only loaded if the models are actually used
bcdui.wkModels.bcdDimensions = new bcdui.core.SimpleModel({ id: "bcdDimensions",  url: bcdui.contextPath + "/bcdui/conf/dimensions.xml" }); 
bcdui.wkModels.bcdCategories = new bcdui.core.SimpleModel({ id: "bcdCategories",  url: bcdui.contextPath + "/bcdui/conf/categories.xml" });
bcdui.wkModels.bcdRowIdent = new bcdui.core.StringDataProvider( { id: "bcdRowIdent", name: "bcdRowIdent", value: "" } );
bcdui.wkModels.bcdColIdent = new bcdui.core.StringDataProvider( { id: "bcdColIdent", name: "bcdColIdent", value: "" } );
