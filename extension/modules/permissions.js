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

const PERMISSION_NAME = "plugins";
const ALLOW = 1;

Components.utils.import("resource://gre/modules/Services.jsm");
Components.utils.import("chrome://ctpm-modules/content/common.js");

XFPerms.Permissions = {
  /* Logger for this object. */
  _logger : null,

  /**
   * Initializes the object.
   */
  init : function() {
    this._logger = XFPerms.getLogger("XFPerms.Permissions");
    this._logger.debug("init");
  },

  /**
   * Returns all domains that have permission.
   * @return array of strings of the domains that have permission.
   */
  getAll : function() {
    this._logger.debug("getAll");

    let list = [];
    let permission;

    try  {
      let enumerator = Services.perms.enumerator;

      while (enumerator.hasMoreElements()) {
        permission = enumerator.getNext().QueryInterface(Ci.nsIPermission);

        if (PERMISSION_NAME == permission.type) {
          list.push(permission.host);
        }
      }
    } catch (e) {
      this._logger.error("getAll\n" + e);
    }

    return list;
  },

  /**
   * Add a domain to the allowed list.
   * @param aDomain the domain to add.
   * @return true if successful, false otherwise.
   */
  add : function(aDomain) {
    this._logger.debug("add: " + aDomain);

    let success = false;

    try {
      let uri = this._getURI(aDomain);

      Services.perms.add(uri, PERMISSION_NAME, ALLOW);
      success = true;
    } catch (e) {
      this._logger.error("add\n" + e);
    }

    return success;
  },

  /**
   * Remove a domain from the allowed list.
   * @param aDomain the domain to remove.
   * @return true if successful, false otherwise.
   */
  remove : function(aDomain) {
    this._logger.debug("remove: " + aDomain);

    let success = false;

    try {
      Services.perms.remove(aDomain, PERMISSION_NAME);
      success = true;
    } catch (e) {
      this._logger.error("remove\n" + e);
    }

    return success;
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
