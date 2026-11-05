# Incursion Red River Item List

Browse item IDs and copy `AddItem` console commands for Incursion Red River.

## Use the terminal

Open the repository's GitHub Pages website, or download **Incursion_Terminal.html** and open it in a browser. The terminal is a self-contained HTML file: it needs no installation, server, build step or external dependencies.

- Sections start collapsed. Select a heading to expand or collapse it.
- **Weapons and Attachments** contains separate, collapsible weapon-family groups, following the original list's grouping. These are browsing groups, not guarantees that every listed part fits every weapon in that family.
- Search matches item IDs, weapon-family names and section names, ignoring case. Spaces, underscores and hyphens are interchangeable; multiple words must all match.
- Matching sections open automatically. Clearing search or pressing Escape restores the layout from before the search.
- **Expand all** and **Collapse all** affect the currently visible sections and weapon groups.
- Select an item name to copy `AddItem <item ID> 1`, or a quantity button to copy that quantity. Item IDs are copied exactly as listed, including spaces and capitalization.

Search and copying run entirely in your browser, including on GitHub Pages. No data is sent to a server. Browsing and folding also work without JavaScript; search and click-to-copy require it. Clipboard access depends on your browser's permissions, with a fallback for local files.

The original **Item_List.htm** and **Weapon builds by Firestar.htm** remain available as reference files.

## Publish with GitHub Pages

A repository owner or maintainer needs to enable hosting once:

1. Open **Settings → Pages** in the repository you want to publish (the original repository or your fork).
2. Under **Build and deployment**, choose **Deploy from a branch**.
3. Select **main** and **/(root)**, then select **Save**.
4. Wait for the Pages deployment to finish and use the site URL shown in those settings.

For a repository named `Incursion-Red-River-Item-List`, the default address is `https://<owner>.github.io/Incursion-Red-River-Item-List/`.

`index.html` forwards the root address to `Incursion_Terminal.html`, preserving existing links and the standalone download. All links are relative so forks and project subpaths work. `.nojekyll` keeps this a plain static site. No Actions deployment workflow is needed.

## Maintain and verify

Edit the item rows in **Incursion_Terminal.html**, keeping each `data-item` value and quantity button accurate. Categories and weapon groups use native `<details>` / `<summary>` elements. Keep their `data-label` values aligned with their headings, and update the displayed item counts when changing a group. Shared items intentionally appear in multiple weapon groups.

Run the dependency-free regression checks with Node.js:

```sh
node --test tests/terminal.test.cjs
```

Also open `Incursion_Terminal.html` in a browser and check keyboard folding, search with no results, clearing search, copy buttons, and a narrow viewport. For an HTTP preview, run `python3 -m http.server 8000` in the repository and open `http://localhost:8000/`.
