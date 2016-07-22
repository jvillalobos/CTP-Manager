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

var EXPORTED_SYMBOLS = [ "registerAboutPage", "unregisterAboutPage" ];

const Cc = Components.classes;
const Ci = Components.interfaces;

Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");

/**
 * Registers itself as an about: provider, so that about:ctp points to a
 * chrome path in this extension.
 */
function AboutPage() {}

AboutPage.prototype = {
  classDescription : "about:ctp",
  contractID : "@mozilla.org/network/protocol/about;1?what=ctp",
  classID : Components.ID("{1bcaf6d5-63e5-4ae5-9244-f4dbecc3e770}"),

  getURIFlags : function(aURI) {
    return Ci.nsIAboutModule.ALLOW_SCRIPT;
  },

  newChannel : function(aURI) {
    let ioService =
      Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);
    let uri =
      ioService.newURI(
        "chrome://ctpmanager/content/ctpAbout.xul", null, null);
    let channel =
      ioService.newChannelFromURI2(uri, null, null, null, null, null);

    channel.originalURI = aURI;

    return channel;
  },

  QueryInterface : XPCOMUtils.generateQI([ Ci.nsIAboutModule ])
};

var factory;

if (XPCOMUtils.generateNSGetFactory) {
  let NSGetFactory = XPCOMUtils.generateNSGetFactory([ AboutPage ]);

  factory = NSGetFactory(AboutPage.prototype.classID);
}

function registerAboutPage() {
  let compMan = Components.manager.QueryInterface(Ci.nsIComponentRegistrar);

  if (!compMan.isCIDRegistered(AboutPage.prototype.classID)) {
    compMan.registerFactory(
      AboutPage.prototype.classID, AboutPage.prototype.classDescription,
      AboutPage.prototype.contractID, factory);
  }
}

function unregisterAboutPage() {
  let compMan = Components.manager.QueryInterface(Ci.nsIComponentRegistrar);

  if (compMan.isCIDRegistered(AboutPage.prototype.classID)) {
    compMan.unregisterFactory(AboutPage.prototype.classID, factory);
  }
}
