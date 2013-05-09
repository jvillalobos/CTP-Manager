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
  },

  /**
   * Load the permission list from the datasource.
   */
  _loadPermissions : function() {
    this._logger.trace("_loadPermissions");

    try {
      let permissions = document.getElementById("domains");
      let generateItem = document.getElementById("generate-menuitem");
      let allowed = XFPerms.Permissions.getAll();
      let allowedCount = allowed.length;
      let foundNulls = false;
      let item;
      let cell1;
      let cell2;

      // clear the current list.
      while (null != permissions.firstChild) {
        permissions.removeChild(permissions.firstChild);
      }

      if (!XFPerms.Permissions.isSinglePermission()) {
        let head = document.createElement("listhead");
        let header1 = document.createElement("listheader");
        let header2 = document.createElement("listheader");

        header1.setAttribute(
          "label", XFPerms.stringBundle.GetStringFromName("ctpm.domain.label"));
        header2.setAttribute(
          "label", XFPerms.stringBundle.GetStringFromName("ctpm.plugin.label"));

        head.appendChild(header1);
        head.appendChild(header2);
        permissions.appendChild(head);
      }

      for (let i = 0; i < allowedCount; i++) {
        if (!XFPerms.Permissions.isSinglePermission() &&
            (null != allowed[i].plugin)) {
          item = document.createElement("listitem");

          if (null == allowed[i].name) {
            foundNulls = true;
          }

          // Firefox 20 and above, 2 columns.
          cell1 = document.createElement("listcell");
          cell1.setAttribute("label", allowed[i].domain);
          item.appendChild(cell1);

          cell2 = document.createElement("listcell");
          cell2.setAttribute("label", allowed[i].name);
          cell2.setAttribute("value", allowed[i].plugin);
          item.appendChild(cell2);
          permissions.appendChild(item);
        } else if (XFPerms.Permissions.isSinglePermission() &&
                   (null == allowed[i].plugin)) {
          item = document.createElement("listitem");

          // Firefox 19 and lower, 1 column.
          cell1 = document.createElement("listcell");
          cell1.setAttribute("label", allowed[i].domain);
          item.appendChild(cell1);
          permissions.appendChild(item);
        }
      }

      // display a message explaining what the null entries are.
      document.getElementById("null-entries").hidden = !foundNulls;

      // null in the about: window.
      if (null != generateItem) {
        generateItem.disabled = (0 == allowedCount);
      }
    } catch (e) {
      this._logger.error("_loadPermissions\n" + e);
    }
  },

  /**
   * Adds a new permission to the list.
   * @param aEvent the event that triggered this action.
   */
  add : function(aEvent) {
    this._logger.debug("add");

    if (XFPerms.Permissions.isSinglePermission()) {
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

        if (!success) {
          this._alert("ctpm.addDomain.title", "ctpm.invalidDomain.label");
        }
      }
    } else {
      window.openDialog(
        "chrome://ctpmanager/content/ctpManagerAdd.xul",
        "ctpmanager-manager-add-dialog", "chrome,centerscreen,dialog,modal");
    }

    this._loadPermissions();
  },

  /**
   * Removes the selected permissions from the list.
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
    let domain;
    let plugin;

    doRemove =
      Services.prompt.confirm(
        window, XFPerms.stringBundle.GetStringFromName("ctpm.removeDomain.title"),
        message);

    if (doRemove) {
      try {
        for (let i = 0; i < count; i ++) {
          item = selected[i];
          domain = item.childNodes[0].getAttribute("label");
          plugin =
            ((null != item.childNodes[1]) ?
             item.childNodes[1].getAttribute("value") : null);

          XFPerms.Permissions.remove(domain, plugin);
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
  exportPermissions : function(aEvent) {
    this._logger.debug("exportPermissions");

    let selected = document.getElementById("domains").selectedItems;
    let count = selected.length;
    let domains = [];
    let domain;
    let plugin;

    try {
      for (let i = 0; i < count; i ++) {
        domain = selected[i].childNodes[0].getAttribute("label");
        plugin =
          ((null != selected[i].childNodes[1]) ?
           selected[i].childNodes[1].getAttribute("value") : null);

        domains.push(
          { domain : XFPerms.addProtocol(domain), plugin : plugin });
      }
    } catch (e) {
      this._logger.error("exportPermissions\n" + e);
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
          success = XFPerms.Export.exportPermissions(domains, fp.file);
        }
      } catch (e) {
        success = false;
        this._logger.error("exportPermissions\n" + e);
      }

      // if an error happens, alert the user.
      if (!success) {
        this._alert("ctpm.exportSelected.title", "ctpm.exportError.label");
      }
    } else {
      // how did we get here???
      this._logger.error(
        "exportPermissions. Tried to export with no domains selected.");
    }
  },

  /**
   * Displays a file selection dialog to choose the file to import from. If
   * chosen, the domains will be imported from that file.
   */
  importPermissions : function(aEvent) {
    this._logger.debug("importPermissions");

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
        let result = XFPerms.Export.importPermissions(fp.file);

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
      this._logger.error("importPermissions\n" + e);
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
