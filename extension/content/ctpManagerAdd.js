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
XFPermsChrome.Add = {

  /* Logger for this object. */
  _logger : null,

  /**
   * Initializes the object.
   */
  init : function() {
    Components.utils.import("resource://gre/modules/Services.jsm");
    Components.utils.import("chrome://ctpm-modules/content/common.js");
    Components.utils.import("chrome://ctpm-modules/content/permissions.js");

    this._logger = XFPerms.getLogger("XFPermsChrome.Add");
    this._logger.debug("init");
    this._loadPlugins();
  },

  /**
   * Uninitializes the object.
   */
  uninit : function() {
  },

  /**
   * Loads the plugin list in the dropdown.
   */
  _loadPlugins : function() {
    this._logger.trace("_loadPlugins");

    let plugins = XFPerms.Permissions.getPlugins();

    if (0 < plugins.length) {
      let list = document.getElementById("plugins");
      let item;

      for (let i = 0; i < plugins.length; i++) {
        item = document.createElement("listitem");
        item.setAttribute("value", plugins[i].permission);
        item.setAttribute("label", plugins[i].name);
        list.appendChild(item);
      }
    }

    // force the select event to decide if the Add button should be enabled.
    this.select();
  },

  /**
   * Accept dialog event handler.
   */
  accept : function() {
    this._logger.debug("accept");

    let domain = XFPerms.addProtocol(document.getElementById("domain").value);
    let selected = document.getElementById("plugins").selectedItems;
    let count = selected.length;
    let success;

    for (let i = 0; i < count; i ++) {
      plugin = selected[i].getAttribute("value");
      success = XFPerms.Permissions.add(domain, plugin);

      if (!success) {
        this._alert("ctpm.addDomain.title", "ctpm.invalidDomain.label");
        break;
      }
    }
  },

  /**
   * onselect event handler. Decides when to enable or disable the Add
   * button.
   * @param aEvent the event that triggered this action.
   */
  select : function (aEvent) {
    this._logger.debug("select");

    let listbox = document.getElementById("plugins");
    let addButton = document.documentElement.getButton("accept");

    addButton.disabled = (0 == listbox.selectedCount);
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
  "load", function() { XFPermsChrome.Add.init(); }, false);
window.addEventListener(
  "unload", function() { XFPermsChrome.Add.uninit(); }, false);
