This is a Firefox add-on that manages the domain whitelist for the plugin Click-to-Play feature. While this whitelist can be modified on demand when visiting sites that use plugins, this might not work correctly on some edge cases, and network administrators might want to have a predetermined whitelist. This add-on simplifies doing this.

**How to use on Desktop Firefox (and SeaMonkey)**

1. Click on the Firefox button on the top left, then select Web Developer, and finally Click-to-Play Manager to open the management window. On Mac OS and some other systems, the menu item is accessible from Tools > Click-to-Play Manager.
2. To add a domain, click on the Add button and then enter the domain name of the site you want to add to the list (*https://www.mozilla.org*, for example). Note that the scheme (http or https) is required on Firefox 42 and above.
3. That's it! You should be able to use all plugins on the site without any problems.

**How to use on Firefox for Android**

1. Enter *about:ctp* in the address bar.
2. To add a domain, click on the Add button and then enter the domain name of the site you want to add to the list (*https://www.mozilla.org*, for example). Note that the scheme (http or https) is required on Firefox 42 and above.
3. That's it! You should be able to access the site again without any problems.
4. It's recommended that you bookmark the management page so that it's easy to get back to it.

**Advanced Features**

Both of these can be found in the File menu on the main management window.

- A generator tool that creates an extension installer with a predefined whitelist. The generated extension doesn't require a restart to install, displays a warning message explaining what is happening and giving the user the option to cancel, and then removes itself.
- An import / export tool that uses simple text files for the whitelist. Files have a simple "one domain per line" format, using hashes (#) as the first character for commenting.

These features are not available on the mobile versions, but you can install the generated installers on them.

The Installer sub-project holds all the source and Makefiles to build the Installer files independently from the main extension. It shouldn't be too much effort to migrate it to any other build system for custom deployments.
