/**
 * Copyright 2013 Jorge Villalobos
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/

const Cc = Components.classes;
const Ci = Components.interfaces;

const INSTALLER_EXTENSION = "xpi";

/**
 * XFPermsChrome namespace.
 */
if ("undefined" == typeof(XFPermsChrome)) {
  var XFPermsChrome = {};
};

/**
 * Installer Generator dialog controller.
 */
XFPermsChrome.Generator = {

  /* Logger for this object. */
  _logger : null,

  /**
   * Initializes the object.
   */
  init : function() {
    Components.utils.import("resource://gre/modules/Services.jsm");
    Components.utils.import("chrome://ctpm-modules/content/common.js");
    Components.utils.import("chrome://ctpm-modules/content/generator.js");

    this._logger = XFPerms.getLogger("XFPermsChrome.Generator");
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
      let allowed = XFPerms.Permissions.getAll();
      let allowedCount = allowed.length;
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
    } catch (e) {
      this._logger.error("_loadPermissions\n" + e);
    }
  },

  /**
   * onselect event handler. Decides when to enable or disable the generate
   * button.
   * @param aEvent the event that triggered this action.
   */
  select : function (aEvent) {
    this._logger.debug("select");

    let listbox = document.getElementById("domains");
    let generateButton = document.documentElement.getButton("accept");

    generateButton.disabled = (0 == listbox.selectedCount);
  },

  /**
   * Opens the file dialog that allows the user to choose where to save the
   * generated file. Once selected, it generates the file.
   * @param aEvent the event that triggered this action.
   */
  generateInstaller : function(aEvent) {
    this._logger.debug("generateInstaller");

    let selected = document.getElementById("domains").selectedItems;
    let count = selected.length;
    let permissions = [];
    let item;

    try {
      for (let i = 0; i < count; i ++) {
        item = selected[i];
        domain = item.childNodes[0].getAttribute("label");
        plugin = null;
        name = null;

        if (null != item.childNodes[1]) {
          plugin = item.childNodes[1].getAttribute("value");
          name = item.childNodes[1].getAttribute("label");
        }

        permissions.push({ domain : domain, plugin : plugin, name : name });
      }
    } catch (e) {
      this._logger.error("generateInstaller\n" + e);
    }

    if (0 < permissions.length) {
      try {
        let fp =
          Cc["@mozilla.org/filepicker;1"].createInstance(Ci.nsIFilePicker);
        let winResult;

        // set up the dialog.
        fp.defaultExtension = "." + INSTALLER_EXTENSION;
        fp.defaultString = "ctpm-installer." + INSTALLER_EXTENSION;
        fp.init(
          window,
          XFPerms.stringBundle.GetStringFromName("ctpm.generateInstaller.title"),
          Ci.nsIFilePicker.modeSave);
        fp.appendFilters(Ci.nsIFilePicker.filterAll);

        // display it.
        winResult = fp.show();

        if ((Ci.nsIFilePicker.returnOK == winResult) ||
            (Ci.nsIFilePicker.returnReplace == winResult)) {
          let title = document.getElementById("title").value.trim();
          let warning =
            document.getElementById("warning").value.trim().
              replace(/\n/g, "\\n");

          XFPerms.Generator.generateInstaller(
            fp.file, permissions, title, warning);
          XFPerms.runWithDelay(function() { window.close(); }, 0);
        }
      } catch (e) {
        this._logger.error("generateInstaller\n" + e);

        // if an error happens, alert the user.
        Services.prompt.alert(
          window,
          XFPerms.stringBundle.GetStringFromName("ctpm.generateInstaller.title"),
          XFPerms.stringBundle.GetStringFromName("ctpm.generateError.label"));
      }
    } else {
      // how did we get here???
      this._logger.error(
        "generateInstaller. Tried to generate installer with no permissions " +
        "selected.");
    }
  }
};

window.addEventListener(
  "load", function() { XFPermsChrome.Generator.init(); }, false);
window.addEventListener(
  "unload", function() { XFPermsChrome.Generator.uninit(); }, false);
