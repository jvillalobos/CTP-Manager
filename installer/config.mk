##
# Copyright 2013 Jorge Villalobos
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
##

# List of permissions to whitelist.
# Example (Firefox 19 and below): 
# { domain: "mozilla.org" }, { domain: "developer.mozilla.org" }
# Example (Firefox 20):
# {"domain":"mozilla.com","plugin":"JavaAppletPlugin.plugin","name":"Java Applet"},{"domain":"youtube.com","plugin":"Flash Player.plugin","name":"Shockwave Flash"}

domains := { domain: "mozilla.org" }

# Localized version of the dialog titles (optional, no quotes).
title_localized :=

# Localized version of the warning message (optional, no quotes).
warning_localized :=

# show a message or not on boot
silent := false
