# SVG Vibe Studio

Standalone SVG Vibe Studio for deployment under `/svg-studio/` on GitHub Pages or another static host.

## Structure

- `index.html` — Studio
- `fonts/` — bundled Vibe Mono Study font resources
- `guides/` — separate usage and deployment documentation
- `privacy.html` is intentionally not bundled in this stripped Studio build; add your own site policy if required by your deployment.

The Studio exports a normal `.svg` file. It does not require a dynamic renderer for the SVG export workflow.


## Donation configuration
The public donation page only displays enabled methods. The owner tool is kept outside the public navigation. For GitHub Pages, export `donation-config.js` and replace the copy in the site before committing. The owner tool also provides a local preview so you can verify changes before deployment.


V14 preserves the Studio live clock in the top bar. It is the browser-local date, time, and time-zone display.
