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

function install(aData, aReason) {}

function uninstall(aData, aReason) {}

function shutdown(aData, aReason) {}

function startup(aData, aReason) {
  CTPMInstaller.init(aReason);
}

var CTPMInstaller = {

  PERMISSION_NAME : "plugins",
  ALLOW : 1,

  // The list of domains to include on the whitelist.
  DOMAINS : [ $(DOMAINS) ],
  // Title for dialogs and optional, localized version of the message.
  TITLE : "Click-to-Play Manager",
  TITLE_LOCALIZED : "$(TITLE)",
  // Installation warning and optional, localized version of the message.
  WARNING :
    "The following list of domains will be added to your Click-to-Play " +
    "whitelist. Select OK to accept.\nWARNING: Plugins can be unstable or " +
    "insecure and should only be enabled when necessary.",
  WARNING_LOCALIZED : "$(WARNING)",

  /**
   * Initializes the object.
   */
  init : function(aReason) {
    Components.utils.import("resource://gre/modules/Services.jsm");
    Components.utils.import("resource://gre/modules/AddonManager.jsm");

    // No windows are opened yet at startup.
    if (APP_STARTUP == aReason) {
      let that = this;
      let observer = {
          observe : function(aSubject, aTopic, aData) {
            if ("domwindowopened" == aTopic) {
              Services.ww.unregisterNotification(observer);

              let window = aSubject.QueryInterface(Ci.nsIDOMWindow);
              // wait for the window to load so that the prompt appears on top.
              window.addEventListener(
                "load", function() { that.run(); }, false);
            }
          }
        };

      Services.ww.registerNotification(observer);
    } else {
      this.run();
    }
  },

  /**
   * Runs the installer.
   */
  run : function() {
    try {
      let domainCount = this.DOMAINS.length;
      let hasLocalFiles = false;
      let domain;

      if ((0 < domainCount) && ( ! $(SILENT) || this._showWarningMessage())) {
        // read all data.
        for (let i = 0 ; i < domainCount ; i++) {
          domain = this.DOMAINS[i];

          if ("string" == typeof(domain) && (0 < domain.length)) {
            this._add(domain);
          }
        }
      }
    } catch (e) {
      this._showAlert("Unexpected error:\n" + e);
    }

    try {
      // auto remove.
      this._suicide();
    } catch (e) {
      this._showAlert(
        "Unexpected error:\n" + e + "\nPlease uninstall this add-on.");
    }
  },

  /**
   * Add a domain to the whitelist.
   * @param aDomain the domain to add.
   */
  _add : function(aDomain) {
    try {
      let uri;

      if ((0 != aDomain.indexOf("http://")) &&
          (0 != aDomain.indexOf("https://"))) {
        aDomain = "http://" + aDomain;
      }

      uri = Services.io.newURI(aDomain, null, null);
      Services.perms.add(uri, this.PERMISSION_NAME, this.ALLOW);
    } catch (e) {
      this._showAlert(
        "Unexpected error adding domain '" + aDomain + "':\n" + e);
    }
  },

  /**
   * Shows a warning indicating that this should be accepted carefully and
   * asking the user if it's OK to proceed.
   * @return true if the user accepts the dialog, false if the user rejects it.
   */
  _showWarningMessage : function() {
    let title =
      ((0 < this.TITLE_LOCALIZED.length) ? this.TITLE_LOCALIZED : this.TITLE);
    let content =
      ((0 < this.WARNING_LOCALIZED.length) ? this.WARNING_LOCALIZED :
       this.WARNING);
    let domainCount = this.DOMAINS.length;

    content += "\n";

    for (let i = 0 ; i < domainCount ; i++) {
      content += "\n" + this.DOMAINS[i];
    }

    return Services.prompt.confirm(null, title, content);
  },

  /**
   * Shows an alert message with the given content.
   * @param aContent the content of the message to display.
   */
  _showAlert : function(aContent) {
    let title =
      ((0 < this.TITLE_LOCALIZED.length) ? this.TITLE_LOCALIZED : this.TITLE);

    Services.prompt.alert(null, title, aContent);
  },

  /**
   * Uninstall this add-on.
   */
  _suicide : function() {
    AddonManager.getAddonByID(
      "$(ID)@ctpm.xulforge.com",
      function(aAddon) {
        aAddon.uninstall();
      });
  }
};
