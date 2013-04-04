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

var EXPORTED_SYMBOLS = [];

const Cc = Components.classes;
const Ci = Components.interfaces;

const SINGLE_PERMISSION_NAME = "plugins";
const PERMISSION_PREFIX = "plugin:"
const ALLOW = 1;

Components.utils.import("resource://gre/modules/Services.jsm");
Components.utils.import("chrome://ctpm-modules/content/common.js");

XFPerms.Permissions = {
  /* Logger for this object. */
  _logger : null,

  /* List of installed plugins. */
  _plugins : null,

  /**
   * Initializes the object.
   */
  init : function() {
    this._logger = XFPerms.getLogger("XFPerms.Permissions");
    this._logger.debug("init");
  },

  /**
   * Returns all plugin permissions.
   * @return array of objects representing the current permissions.
   */
  getAll : function() {
    this._logger.debug("getAll");

    let list = [];
    let permission;

    try  {
      let enumerator = Services.perms.enumerator;

      while (enumerator.hasMoreElements()) {
        permission = enumerator.getNext().QueryInterface(Ci.nsIPermission);

        if (SINGLE_PERMISSION_NAME == permission.type) {
          list.push( { domain : permission.host, plugin : null, name : null });
        } else if (0 == permission.type.indexOf(PERMISSION_PREFIX)) {
          let plugin = permission.type.substring(PERMISSION_PREFIX.length);
          let name = this._getPluginNameByPermission(plugin);

          list.push(
            { domain : permission.host, plugin : plugin, name : name });
        }
      }
    } catch (e) {
      this._logger.error("getAll\n" + e);
    }

    return list;
  },

  /**
   * Add a domain / plugin pair to the allowed list.
   * @param aDomain the domain to add.
   * @param aPlugin the plugin to add the permission to (null in < 20).
   * @return true if successful, false otherwise.
   */
  add : function(aDomain, aPlugin) {
    this._logger.debug("add: Domain: " + aDomain + ", plugin: " + aPlugin);

    let success = false;

    try {
      let uri = this._getURI(aDomain);
      let permission =
        ((null != aPlugin) ? (PERMISSION_PREFIX + aPlugin) :
         SINGLE_PERMISSION_NAME);

      Services.perms.add(uri, permission, ALLOW);
      success = true;
    } catch (e) {
      this._logger.error("add\n" + e);
    }

    return success;
  },

  /**
   * Remove a domain / plugin pair from the allowed list.
   * @param aDomain the domain to remove.
   * @param aPlugin the plugin to add the permission to (null in < 20).
   * @return true if successful, false otherwise.
   */
  remove : function(aDomain, aPlugin) {
    this._logger.debug("remove: Domain: " + aDomain + ", plugin: " + aPlugin);

    let success = false;
    let permission =
      ((null != aPlugin) ? (PERMISSION_PREFIX + aPlugin) :
       SINGLE_PERMISSION_NAME);

    try {
      Services.perms.remove(aDomain, permission);
      success = true;
    } catch (e) {
      this._logger.error("remove\n" + e);
    }

    return success;
  },

  /**
   * Indicates if this platform version has a single plugins permission or one
   * per plugin type.
   * @return true if the platform has a single plugins permission.
   */
  isSinglePermission : function() {
    this._logger.debug("isSinglePermission");

    let majorVersion = Services.appinfo.platformVersion.split(".")[0];

    return (20 > majorVersion);
  },

  /**
   * Gets an array of objects representing the installed plugins.
   * @return array of objects with the plugin name and permission string.
   */
  getPlugins : function() {
    this._logger.debug("getPlugins");

    let plugins = [];
    let tags = this._getPluginTags();

    for (let tag of tags) {
      plugins.push(
        { name : this._makeNicePluginName(tag.name),
          permission : tag.filename });
    }

    return plugins;
  },

  /**
   * Returns the list of installed plugins.
   * @return the list of installed plugins.
   */
  _getPluginTags : function() {
    this._logger.trace("_getPluginTags");

    if (null == this._plugins) {
      this._plugins =
        Cc["@mozilla.org/plugin/host;1"].getService(Ci.nsIPluginHost).
          getPluginTags({});
    }

    return this._plugins;
  },

  /**
   * Gets the 'nice' plugin name from the given permission string.
   * @param aFileName the permission string of the plugin.
   * @return the 'nice' plugin name that corresponds to the given permission.
   */
  _getPluginNameByPermission : function(aPermission) {
    this._logger.trace("_getPluginNameByPermission");

    let tags = this._getPluginTags();
    let name = null;

    for (let tag of tags) {
      if (aPermission == tag.filename) {
        name = this._makeNicePluginName(tag.name);
        break;
      }
    }

    return name;
  },

  /**
   * Cleans up the plugin name to a more readable form.
   * Taken from /browser/base/content/pageinfo/permissions.js (Firefox 20)
   * @param aPluginName the name to clean up.
   * @return cleaned up plugin name.
   */
  _makeNicePluginName : function(aPluginName) {
    this._logger.trace("makeNicePluginName");

    let newName =
      aPluginName.replace(/[\s\d\.\-\_\(\)]+$/, "").
        replace(/\bplug-?in\b/i, "").trim();

    return newName;
  },

  /**
   * Returns an nsIURI version of the domain string.
   * @param aDomainString the user-provided domain string.
   * @return the nsIURI that corresponds to the domain string.
   */
  _getURI : function(aDomainString) {
    this._logger.trace("_getURI");

    return Services.io.newURI(aDomainString, null, null);
  }
};

/**
 * Constructor.
 */
(function() {
  this.init();
}).apply(XFPerms.Permissions);
