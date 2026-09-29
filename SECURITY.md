# Security Policy

## Supported versions

Only the latest published version of `@thixpin/md2book` receives security fixes.

## Reporting a vulnerability

Please do not open a public issue. Report it privately through GitHub:
[Report a vulnerability](https://github.com/thixpin/md2book/security/advisories/new).

Include the md2book version (`npm ls -g @thixpin/md2book`), your Node.js version and operating system, and
the steps or a small book that reproduces the problem. You should get a reply within a week. Once a
fix is released, the advisory is published with credit to you unless you prefer otherwise.

## Scope

md2book reads a book's Markdown, config and images, and writes the editions. Relevant reports
include, for example:

- reading or writing files outside the book folder and the output folder;
- a page loading anything from the network while building a PDF, cover or web edition;
- a font download that is used without matching the SHA-256 in the shipped manifest;
- script injection from a manuscript into the generated web edition.
