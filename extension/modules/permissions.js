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
const PERMISSION_PREFIX = "plugin:";
const INSECURE_PERMISSION_PREFIX = "plugin-vulnerable:";
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

      if (null == aPlugin) {
        Services.perms.add(uri, SINGLE_PERMISSION_NAME, ALLOW);
      } else {
        Services.perms.add(uri, PERMISSION_PREFIX + aPlugin, ALLOW);
        Services.perms.add(uri, INSECURE_PERMISSION_PREFIX + aPlugin, ALLOW);
      }

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

    try {
      if (null == aPlugin) {
        Services.perms.remove(aDomain, SINGLE_PERMISSION_NAME);
      } else {
        Services.perms.remove(aDomain, PERMISSION_PREFIX + aPlugin);
        Services.perms.remove(aDomain, INSECURE_PERMISSION_PREFIX + aPlugin);
      }

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
          permission : this._getPluginPermissionFromTag(tag) });
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
   * @param aPermission the permission string of the plugin.
   * @return the 'nice' plugin name that corresponds to the given permission.
   */
  _getPluginNameByPermission : function(aPermission) {
    this._logger.trace("_getPluginNameByPermission");

    let tags = this._getPluginTags();
    let name = null;

    for (let tag of tags) {
      if (aPermission == this._getPluginPermissionFromTag(tag)) {
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
   * Gets the plugin permission string from the tag object. In Firefox 20, this
   * is the plugin filename. In 21 an above, the file extension is removed and
   * Flash and Java are special-cased.
   * @param aTag the tag object with the plugin information.
   * @return permission string that corresponds to the plugin in the tag.
   */
  _getPluginPermissionFromTag : function(aTag) {
    this._logger.trace("_getPluginPermissionFromTag");

    let permission = null;
    let majorVersion = Services.appinfo.platformVersion.split(".")[0];

    if (21 <= majorVersion) {
      let mimeTypes = aTag.getMimeTypes();

      if (this._isFlashPlugin(mimeTypes)) {
        permission = "flash";
      } else if (this._isJavaPlugin(mimeTypes)) {
        permission = "java";
      } else {
        let lastPeriod = aTag.filename.lastIndexOf(".");

        permission =
          ((0 < lastPeriod) ? aTag.filename.substring(0, lastPeriod) :
           aTag.filename);
        // Remove digits at the end
        permission = permission.replace(/[0-9]+$/, "");
      }
    } else {
      permission = aTag.filename;
    }

    return permission;
  },

  /**
   * Checks if the tag object corresponds to the Java plugin.
   * @param aMimeTypes the list of MIME types for the plugin.
   * @return true if the tag corresponds to the Java plugin.
   */
  _isJavaPlugin : function(aMimeTypes) {
    this._logger.trace("_isJavaPlugin");

    let isJava = false;
    let mimeType;

    for (let i = 0; i < aMimeTypes.length; i++) {
      mimeType =
        ((null != aMimeTypes[i].type) ? aMimeTypes[i].type : aMimeTypes[i]);

      if ((0 == mimeType.indexOf("application/x-java-vm")) ||
          (0 == mimeType.indexOf("application/x-java-applet")) ||
          (0 == mimeType.indexOf("application/x-java-bean"))) {
        isJava = true;
        break;
      }
    }

    return isJava;
  },

  /**
   * Checks if the tag object corresponds to the Flash plugin.
   * @param aMimeTypes the list of MIME types for the plugin.
   * @return true if the tag corresponds to the Flash plugin.
   */
  _isFlashPlugin : function(aMimeTypes) {
    this._logger.trace("_isFlashPlugin");

    let isFlash = false;
    let mimeType;

    for (let i = 0; i < aMimeTypes.length; i++) {
      mimeType =
        ((null != aMimeTypes[i].type) ? aMimeTypes[i].type : aMimeTypes[i]);

      if (0 == mimeType.indexOf("application/x-shockwave-flash")) {
        isFlash = true;
        break;
      }
    }

    return isFlash;
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
