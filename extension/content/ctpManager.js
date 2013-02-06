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

const Cc = Components.classes;
const Ci = Components.interfaces;

/**
 * XFPermsChrome namespace.
 */
if ("undefined" == typeof(XFPermsChrome)) {
  var XFPermsChrome = {};
};

/**
 * Manager dialog controller.
 */
XFPermsChrome.Manager = {

  /* Logger for this object. */
  _logger : null,

  /**
   * Initializes the object.
   */
  init : function() {
    Components.utils.import("resource://gre/modules/Services.jsm");
    Components.utils.import("chrome://ctpm-modules/content/common.js");
    Components.utils.import("chrome://ctpm-modules/content/permissions.js");

    this._logger = XFPerms.getLogger("XFPermsChrome.Manager");
    this._logger.debug("init");
    this._loadPermissions();
  },

  /**
   * Uninitializes the object.
   */
  uninit : function() {
    Components.utils.unload("chrome://ctpm-modules/content/permissions.js");
    Components.utils.unload("chrome://ctpm-modules/content/common.js");
    Components.utils.unload("resource://gre/modules/Services.jsm");
  },

  /**
   * Load the permission list from the datasource.
   */
  _loadPermissions : function() {
    this._logger.trace("_loadPermissions");

    try {
      let domains = document.getElementById("domains");
      let generateItem = document.getElementById("generate-menuitem");
      let allowed = XFPerms.Permissions.getAll();
      let allowedCount = allowed.length;
      let item;

      // clear the current list.
      while (null != domains.firstChild) {
        domains.removeChild(domains.firstChild);
      }

      for (let i = 0; i < allowedCount; i++) {
        item = document.createElement("listitem");
        item.setAttribute("label", allowed[i]);
        item.setAttribute("value", allowed[i]);
        domains.appendChild(item);
      }

      // null in the about: window.
      if (null != generateItem) {
        generateItem.disabled = (0 == allowedCount);
      }
    } catch (e) {
      this._logger.error("_loadPermissions\n" + e);
    }
  },

  /**
   * Adds a new domain to the list.
   * @param aEvent the event that triggered this action.
   */
  add : function(aEvent) {
    this._logger.debug("add");

    let domain = { value : "" };
    let promptResponse;

    promptResponse =
      Services.prompt.prompt(
        window, XFPerms.stringBundle.GetStringFromName("ctpm.addDomain.title"),
        XFPerms.stringBundle.formatStringFromName(
          "ctpm.enterDomain.label", [ XFPerms.Permissions.LOCAL_FILES ], 1),
        domain, null, { value : false });

    if (promptResponse) {
      let success = XFPerms.Permissions.add(XFPerms.addProtocol(domain.value));

      if (success) {
        this._loadPermissions();
      } else {
        this._alert("ctpm.addDomain.title", "ctpm.invalidDomain.label");
      }
    }
  },

  /**
   * Removes the selected domains from the list.
   * @param aEvent the event that triggered this action.
   */
  remove : function(aEvent) {
    this._logger.debug("remove");

    let selected = document.getElementById("domains").selectedItems;
    let count = selected.length;
    let message =
      ((1 == count) ?
       XFPerms.stringBundle.GetStringFromName("ctpm.removeOne.label") :
       XFPerms.stringBundle.formatStringFromName(
        "ctpm.removeMany.label", [ count ], 1));
    let doRemove;
    let item;

    doRemove =
      Services.prompt.confirm(
        window, XFPerms.stringBundle.GetStringFromName("ctpm.removeDomain.title"),
        message);

    if (doRemove) {
      try {
        for (let i = 0; i < count; i ++) {
          item = selected[i];
          XFPerms.Permissions.remove(item.getAttribute("value"));
        }
      } catch (e) {
        this._logger.debug("remove\n" + e);
      }

      this._loadPermissions();
    }
  },

  /**
   * onselect event handler. Decides when to enable or disable the remove
   * button and export menu.
   * @param aEvent the event that triggered this action.
   */
  select : function (aEvent) {
    this._logger.debug("select");

    let removeButton = document.getElementById("remove");
    let exportMenu = document.getElementById("export-menuitem");
    let listbox = document.getElementById("domains");

    removeButton.disabled = (0 == listbox.selectedCount);

    // null in the about:remotexul window.
    if (null != exportMenu) {
      exportMenu.disabled = (0 == listbox.selectedCount);
    }
  },

  /**
   * Displays a file selection dialog to choose the file to export to. If
   * chosen, the selected domains will be exported to that file.
   */
  exportDomains : function(aEvent) {
    this._logger.debug("exportDomains");

    let selected = document.getElementById("domains").selectedItems;
    let count = selected.length;
    let domains = [];
    let domain;

    try {
      for (let i = 0; i < count; i ++) {
        domain = selected[i].getAttribute("value");
        domains.push(XFPerms.addProtocol(domain));
      }
    } catch (e) {
      this._logger.error("exportDomains\n" + e);
    }

    if (0 < domains.length) {
      let success = true;

      try {
        // only import the script when necessary.
        Components.utils.import("chrome://ctpm-modules/content/export.js");

        let fp =
          Cc["@mozilla.org/filepicker;1"].createInstance(Ci.nsIFilePicker);
        let winResult;

        // set up the dialog.
        fp.defaultExtension = "." + XFPerms.Export.DEFAULT_EXTENSION;
        fp.defaultString = "domains." + XFPerms.Export.DEFAULT_EXTENSION;
        fp.init(
          window,
          XFPerms.stringBundle.GetStringFromName("ctpm.exportSelected.title"),
          Ci.nsIFilePicker.modeSave);
        fp.appendFilters(Ci.nsIFilePicker.filterAll);

        // display it.
        winResult = fp.show();

        if ((Ci.nsIFilePicker.returnOK == winResult) ||
            (Ci.nsIFilePicker.returnReplace == winResult)) {
          success = XFPerms.Export.exportDomains(domains, fp.file);
        }
      } catch (e) {
        success = false;
        this._logger.error("exportDomains\n" + e);
      }

      // if an error happens, alert the user.
      if (!success) {
        this._alert("ctpm.exportSelected.title", "ctpm.exportError.label");
      }
    } else {
      // how did we get here???
      this._logger.error(
        "exportDomains. Tried to export with no domains selected.");
    }
  },

  /**
   * Displays a file selection dialog to choose the file to import from. If
   * chosen, the domains will be imported from that file.
   */
  importDomains : function(aEvent) {
    this._logger.debug("importDomains");

    let success = true;

    try {
      // only import the script when necessary.
      Components.utils.import("chrome://ctpm-modules/content/export.js");

      let fp =
        Cc["@mozilla.org/filepicker;1"].createInstance(Ci.nsIFilePicker);
      let winResult;

      // set up the dialog.
      fp.defaultExtension = "." + XFPerms.Export.DEFAULT_EXTENSION;
      fp.init(
        window,
        XFPerms.stringBundle.GetStringFromName("ctpm.import.title"),
        Ci.nsIFilePicker.modeOpen);
      fp.appendFilters(Ci.nsIFilePicker.filterAll);

      // display it.
      winResult = fp.show();

      if ((Ci.nsIFilePicker.returnOK == winResult) ||
          (Ci.nsIFilePicker.returnReplace == winResult)) {
        let result = XFPerms.Export.importDomains(fp.file);

        success = result.success;

        if (success) {
          let importCount = result.domains.length;
          let failCount = result.invalids.length;
          let message =
            ((1 == importCount) ?
             XFPerms.stringBundle.GetStringFromName(
              "ctpm.import.importedOne.label") :
             XFPerms.stringBundle.formatStringFromName(
              "ctpm.import.importedMany.label", [ importCount ], 1));

          if (0 < failCount) {
            message += "\n";
            message +=
              ((1 == failCount) ?
               XFPerms.stringBundle.GetStringFromName(
                "ctpm.import.invalidOne.label") :
               XFPerms.stringBundle.formatStringFromName(
                "ctpm.import.invalidMany.label", [ failCount ], 1));
          }

          Services.prompt.alert(
            window, XFPerms.stringBundle.GetStringFromName("ctpm.import.title"),
            message);
        }
      }

      this._loadPermissions();
    } catch (e) {
      success = false;
      this._logger.error("importDomains\n" + e);
    }

    if (!success) {
      this._alert("ctpm.import.title", "ctpm.importError.label");
    }
  },

  /**
   * Opens the Installer generator dialog.
   * @param aEvent the event that triggered this action.
   */
  launchGenerator : function(aEvent) {
    this._logger.debug("launchGenerator");

    let win =
      Services.wm.getMostRecentWindow("ctpmanager-generator-dialog");

    // check if a window is already open.
    if ((null != win) && !win.closed) {
      win.focus();
    } else {
      window.openDialog(
        "chrome://ctpmanager/content/ctpGenerator.xul",
        "ctpmanager-generator-dialog",
        "chrome,titlebar,centerscreen,dialog,resizable");
    }
  },

  /**
   * Shows a basic alert prompt with a title and content.
   * @param aTitleKey the key to the string that is used for the title.
   * @param aContentKey the key to the string that is used for the content.
   */
  _alert : function(aTitleKey, aContentKey) {
    this._logger.trace("_alert");

    Services.prompt.alert(
      window, XFPerms.stringBundle.GetStringFromName(aTitleKey),
      XFPerms.stringBundle.GetStringFromName(aContentKey));
  }
};

window.addEventListener(
  "load", function() { XFPermsChrome.Manager.init(); }, false);
window.addEventListener(
  "unload", function() { XFPermsChrome.Manager.uninit(); }, false);
