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
 * A namespace for the BCUDI GUI contextMenu widget.
 * @namespace bcdui.widget.contextMenu
 * @private
 */
bcdui.util.namespace("bcdui.widget.contextMenu",
/** @lends bcdui.widget.contextMenu */
{
  /**
   * Context menu div and standard data providers are singletons, created here for usage everywhere
   * @private
   */
  _createContextMenuDiv: function()
    {
      // The existence of the div is mandatory in the theme
      // It cannot be create dynamically as we need is synchronously and may be during page load when creating the context menu
      // Doing it dynamically fails at least for IE6 and some IE8 (creating a child of body during page load from script inside body), also applies to tooltip
      var cm = bcdui._migPjs._$("bcdContextMenuDiv");
      if( "true"!=cm.attr("bcdInitialized") ) {
        bcdui.widget.contextMenu._attachDelayedAutoHiding({ targetHTMLElementId: "bcdContextMenuDiv" });
        bcdui._migPjs._$("bcdContextMenuDiv").on("click", bcdui.widget.contextMenu._clickItem);
        cm.attr("bcdInitialized","true");
      }
    },

  /**
   * @private
   */
  _attachDelayedAutoHiding: function(args)
    {
      var timer = null;
      bcdui._migPjs._$(args.targetHTMLElementId).on("click", function() {
        if (timer != null) {
          window.clearTimeout(timer);
          timer = null;
        }
        if(bcdui._migPjs._$(args.targetHTMLElementId).length > 0)
          bcdui._migPjs._$(args.targetHTMLElementId).hide();
      });
      bcdui._migPjs._$(args.targetHTMLElementId).on("mouseleave", function() {
        if (timer != null) {
          window.clearTimeout(timer);
          timer = null;
        }
        if(bcdui._migPjs._$(args.targetHTMLElementId).length > 0){
          timer = setTimeout(function() { bcdui._migPjs._$(args.targetHTMLElementId).hide(); }, (args.delay || 500));
        }
      });
      bcdui._migPjs._$(args.targetHTMLElementId).on("mouseenter", function() {
        if (timer != null) {
          window.clearTimeout(timer);
          timer = null;
        }
      });
    },

    /**
     * 
     * @private
     */
    _clickItem: function(/* Event */ event)
    {
      var event = new bcdui.widget.DetachedEvent(event);
      var bcdMenuCode = bcdui._migPjs._$(event.target).attr("bcdMenuCode");
      var bcdContextMenuDiv = bcdui._migPjs._$("bcdContextMenuDiv");
      var eventSourceElement = bcdContextMenuDiv.attr("bcdEventSourceElementId");
      bcdui._migPjs._$("bcdContextMenuDiv").hide();
      if (bcdMenuCode != null && eventSourceElement != null) {
        event.eventSourceElement = eventSourceElement;
        event.eventSrcElement = eventSourceElement;
        // set the bcdRowIdent and bcdColIdent values looking up in ancestor path of the eventSourceElement
        var _srcEl = jQuery("#" + event.eventSourceElement);
        event.bcdRowIdent = _srcEl.closest("[bcdRowIdent]").attr("bcdRowIdent");
        event.bcdColIdent = _srcEl.closest("[bcdColIdent]").attr("bcdColIdent");
        // We must call this function deferred, because otherwise the menu
        // mechanism gets broken in case of an exception.
        setTimeout((function() { eval(bcdMenuCode) }).bind(event));
      }
    }
});