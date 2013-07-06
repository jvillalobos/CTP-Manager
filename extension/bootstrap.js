/**
 * Copyright 2013 Jorge Villalobos
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/

"use strict";

const Cc = Components.classes;
const Ci = Components.interfaces;

function install(aData, aReason) {}

function uninstall(aData, aReason) {}

function startup(aData, aReason) {
  CTPM.init();
}

function shutdown(aData, aReason) {
  CTPM.uninit();
}

let CTPM = {
  _logger : null,

  init : function() {
    Components.utils.import("resource://gre/modules/Services.jsm");
    Components.utils.import("chrome://ctpm-modules/content/common.js");

    this._logger = XFPerms.getLogger("RXM");
    this._logger.debug("init");
    this.windowListener._logger = XFPerms.getLogger("CTPM.windowListener");

    let enumerator = Services.wm.getEnumerator("navigator:browser");

    while (enumerator.hasMoreElements()) {
      this.windowListener.addUI(enumerator.getNext());
    }

    Services.wm.addListener(this.windowListener);
  },

  uninit : function() {
    this._logger.debug("uninit");

    let enumerator = Services.wm.getEnumerator("navigator:browser");

    Services.wm.removeListener(this.windowListener);

    while (enumerator.hasMoreElements()) {
      this.windowListener.removeUI(enumerator.getNext());
    }

    Components.utils.unload("chrome://ctpm-modules/content/export.js");
    Components.utils.unload("chrome://ctpm-modules/content/generator.js");
    Components.utils.unload("chrome://ctpm-modules/content/about.js");
    Components.utils.unload("chrome://ctpm-modules/content/permissions.js");
    Components.utils.unload("chrome://ctpm-modules/content/common.js");
  },

  windowListener :
    {
      _logger : null,

      _openDialogFunction : null,

      /**
       * Adds the menu items used to open the RXM window, and the about: page
       * for mobile devices.
       */
      addUI : function(aWindow) {
        this._logger.debug("addUI");

        if (null == this._openDialogFunction) {
          this._openDialogFunction =
            function (aEvent) {
              let win = aEvent.target.ownerDocument.defaultView;
              let newWin =
                win.Services.wm.
                  getMostRecentWindow("ctpmanager-manager-dialog");

              // check if a window is already open.
              if ((null != newWin) && !newWin.closed) {
                newWin.focus();
              } else {
                win.openDialog(
                  "chrome://ctpmanager/content/ctpManager.xul",
                  "ctpmanager-manager-dialog",
                  "chrome,titlebar,centerscreen,dialog,resizable");
              }
            };
        }

        // full Firefox menu
        this.tryToAddMenuItemAt(aWindow, "menu_ToolsPopup");
        // Firefox app menu
        this.tryToAddMenuItemAt(aWindow, "appmenu_webDeveloper_popup");
        // SeaMonkey menu
        this.tryToAddMenuItemAt(aWindow, "taskPopup");
        // Komodo menu
        this.tryToAddMenuItemAt(aWindow, "popup_tools");

        // add an about: page for mobile devices. This is a simplified version
        // of the UI.
        if (XFPerms.isMobile()) {
          Components.utils.import("chrome://ctpm-modules/content/about.js");
          registerAboutPage();
        }
      },

      /**
       * Tries to add a menu item at the specified location.
       */
      tryToAddMenuItemAt : function(aWindow, aParentId) {
        this._logger.debug("tryToAddMenuItemAt");

        let doc = aWindow.document;
        let parent = doc.getElementById(aParentId);

        if ((null != parent) && ("menupopup" == parent.localName)) {
          let menuitem = doc.createElement("menuitem");

          menuitem.setAttribute("id", "ctpm-menu-" + aParentId);
          menuitem.setAttribute(
            "label", XFPerms.stringBundle.GetStringFromName("ctpm.menu.label"));
          menuitem.setAttribute(
            "accesskey",
            XFPerms.stringBundle.GetStringFromName("ctpm.menu.accesskey"));

          menuitem.addEventListener("command", this._openDialogFunction);

          switch (aParentId) {
            case "menu_ToolsPopup":
              this._addMenuItem(
                parent, menuitem, doc.getElementById("sanitizeSeparator"));
              break;
            case "appmenu_webDeveloper_popup":
              this._addMenuItem(
                parent, menuitem,
                doc.getElementById("appmenu_devToolsEndSeparator"));
              break;
            case "taskPopup":
              this._addMenuItem(
                parent, menuitem, doc.getElementById("sync-setup"));
              break;
            default:
              this._addMenuItem(parent, menuitem);
              break;
          }
        }
      },

      /**
       * Removes all added UI elements.
       */
      removeUI : function(aWindow) {
        this._logger.debug("removeUI");

        this.tryToRemoveMenuItem(aWindow, "menu_ToolsPopup");
        this.tryToRemoveMenuItem(aWindow, "appmenu_webDeveloper_popup");
        this.tryToRemoveMenuItem(aWindow, "taskPopup");
        this.tryToRemoveMenuItem(aWindow, "popup_tools");
        this._openDialogFunction = null;

        if (XFPerms.isMobile()) {
          unregisterAboutPage();
          Components.utils.unload("chrome://ctpm-modules/content/about.js");
        }
      },

      /**
       * Tries to remove the specified menuitem.
       */
      tryToRemoveMenuItem : function(aWindow, aId) {
        this._logger.debug("tryToRemoveMenuItem");

        let doc = aWindow.document;
        let menuitem = doc.getElementById("ctpm-menu-" + aId);

        if (null != menuitem) {
          menuitem.removeEventListener("command", this._openDialogFunction);
          menuitem.parentNode.removeChild(menuitem);
        }
      },

      /**
       * Tries to insert the menuitem under the parent and before the reference
       * node. If the reference node doesn't exist or isn't a child of the
       * parent, the menuitem is appended at the end.
       * @param aParent the parent node to insert the menuitem in.
       * @param aMenuItem the menuitem to insert.
       * @param aRerefence the reference node to insert the node before. Can be
       * null.
       */
      _addMenuItem : function(aParent, aMenuItem, aReference) {
        this._logger.trace("_addMenuItem");

        if ((null != aReference) && (aParent == aReference.parentNode)) {
          aParent.insertBefore(aMenuItem, aReference);
        } else {
          aParent.appendChild(aMenuItem);
        }
      },

      onOpenWindow : function(xulWindow) {
        this._logger.debug("onOpenWindow");

        // A new window has opened.
        let that = this;
        let domWindow =
          xulWindow.QueryInterface(Ci.nsIInterfaceRequestor).
          getInterface(Ci.nsIDOMWindow);

        // Wait for it to finish loading
        domWindow.addEventListener(
          "load",
          function listener() {
            domWindow.removeEventListener("load", listener, false);
            // If this is a browser window then setup its UI
            if (domWindow.document.documentElement.getAttribute("windowtype") ==
                "navigator:browser") {
              that.addUI(domWindow);
            }
        }, false);
      },

      onCloseWindow : function(xulwindow) {},
      onWindowTitleChange: function(xulWindow, newTitle) {}
    }
};
