# Moopans Water Invoice Generator

A static, Netlify-hostable invoice generator based on the provided Moopans water bill invoice template.

## Files

- `index.html` - main app
- `styles.css` - print-ready A4 styling
- `app.js` - invoice form, calculations, local save, JSON import/export
- `assets/` - logo assets extracted from the provided template
- `netlify.toml` - optional Netlify config

## Deploy to Netlify

1. Go to Netlify.
2. Choose **Add new site** > **Deploy manually**.
3. Drag and drop this whole folder or the ZIP file.
4. No build command is required. Publish directory is the project root.

## Printing

Use the **Print / Save PDF** button. In the browser print settings, use:

- Paper: A4
- Margins: None / Default off if available
- Scale: 100%
- Background graphics: ON

