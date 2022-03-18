# Doc Site Generator

Generates a static documentation website from [asciidoctor (`.adoc`)](https://asciidoctor.org/) files
using [Asciidoctor.js](https://github.com/asciidoctor/asciidoctor.js) to convert `.adoc` files to html
and [kroki](https://kroki.io) to geneerate images for embedded diagrams in any format supported by kroki

## Requirements

No dependencies

## Settings

Depending on your setup, you may want to modify these settings:

* `docSiteGenerator.docsRootDirectory`: Specify the documentation root directory relative to the
workspace directory. Default value is `.` i.e the workspace directory itself. If the documentation is
part of a larger project then specify the documentation subdirectory here.
* `docSiteGenerator.outputDirectory`:  The directory (relative to the workspace directory) to which the
generated site will be written. The clean command deletes all the contents of this directory. 
Default value is `./build/doc-site/`
* `docSiteGenerator.krokiServerUrl`: The URL of kroki server. Default value is 'kroki.io'. You may
change this to point to your own or any other kroki installation. You should only enter the host e.g.
`kroki.io` without the protocol i.e. https. The diagram fetching routine uses https and has not been 
tested against a http target.

## Commands
### Clean
Deletes all contents of the output directory

### Generate Site

The `Doc Site Generator: Generate Site` command processes files from the documentation root directory
into the output directory, converting any `.adoc` files to html. Any other resources e.g. html or images
will be copied as they are to the output directory. This command always cleans the output directory
before generating the site.
<!-- \!\[feature X\]\(images/feature-x.png\) -->

### Serve
Launches a server that serves the generated site. This command always cleans the output diectory and 
generates the site.

### Stop Server
Stops the server that serves the generated site if it's running


## Known Issues
The extension has only been tested with the online kroki server (`kroki.io`). If specify a different
kroki server url in the settings as described above, please note that the diagram fetching routine 
uses https and has not been tested against a http target.

## Release Notes

### 1.0.0

Initial release of Doc Site Genrator

----------------------------------------------
