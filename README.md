# Incursion Red River Item List

Browse item IDs and copy `AddItem` console commands for Incursion Red River.

## Use the terminal

Open the repository's GitHub Pages website, or download the repository and open **Incursion_Terminal.html** in your browser. Keep the `site/` folder beside it for the styles, search, copy buttons, and favicon. No installation or build step is needed.

- Sections start collapsed. Select a heading to expand or collapse it.
- **Weapons and Attachments** contains separate, collapsible weapon-family groups, following the original list's grouping. These are browsing groups, not guarantees that every listed part fits every weapon in that family.
- Search matches item IDs, previous spellings, weapon-family names and section names, ignoring case. Spaces, underscores and hyphens are interchangeable; multiple words must all match.
- Matching sections open automatically. Clearing search or pressing Escape restores the layout from before the search.
- **Expand all** and **Collapse all** affect the currently visible sections and weapon groups.
- Select an item name to copy `AddItem <item ID> 1`, or a quantity button to copy that quantity. Item IDs are copied exactly as listed, including spaces and capitalization.

Search and copying run entirely in your browser, including on GitHub Pages. No data is sent to a server. Browsing and folding also work without JavaScript; search and click-to-copy require it. Clipboard access depends on your browser's permissions, with a fallback for local files.

**Item_List.htm** contains the same catalog as the terminal in plain-text form. **Weapon builds by Firestar.htm** retains the original builds, with corrected command IDs; the builds and their stats have not been retested.

## Catalog source and corrections

The catalog incorporates all **825 exact row names** in the supplied FModel export **DT_Vendor_Old.json**. The compact [row-name snapshot](data/vendor-row-ids.json) records the source table/package, the raw file SHA-256, corrections and retained legacy IDs. The large raw export is not needed at runtime and is not included in this repository.

The table's actual name is `DT_Vendor_Old`; the `_Old` suffix is not removed or treated as proof that this is the active table used by the current game. The game version was not recorded. Export membership establishes that a row exists in this table, **not** that its `AddItem` command succeeds in the current game, that an item is obtainable, or that listed attachments fit every weapon in a group.

Use **row names** for command IDs, not referenced asset names. A vendor entry may select a preset while carrying an unrelated/default `ItemDefinition` reference; asset filenames also differ from row names. The snapshot therefore keeps every row name exactly, including game-side spelling mistakes.

This update adds **206 IDs** beyond the reconciled original catalog and corrects **18 existing spellings**, including these command changes:

| Previous ID | Export row ID |
| --- | --- |
| `AUG A3` | `AUG_A3` |
| `Daniel_Defense_M-LOK_Vertical_Foregrip1` | `Daniel_Defense_M-LOK_Vertical_Foregrip` |
| `Honey_Badger_12_Inch_Barrel` | `Honey_Badger_12_Inch_barrel` |
| `Honey_Badger_12_Inch_Handguard` | `Honey_Badger_12_Inch_handguard` |
| `Honey_Badger_6_Inch_Handguard` | `Honey_Badger_6_Inch_handguard` |
| `Honey_Badger_7_Inch_Barrel` | `Honey_Badger_7_Inch_barrel` |
| `Honey_Badger_9_Inch_Barrel` | `Honey_Badger_9_Inch_barrel` |
| `Honey_Badger_9_Inch_Handguard` | `Honey_Badger_9_Inch_handguard` |
| `Inforce_APLC_Compact_Flashlight` | `Inforce_APLc_Compact_Flashlight` |
| `Inforce_WMLX_Flashlight` | `Inforce_WMLx_Flashlight` |
| `Military_Laptop 1` | `Military_Laptop` |
| `Military_Radio 1` | `Military_Radio` |
| `P320_Barrel_Threaded` | `P320_Threaded_Barrel` |
| `Recording_Backpack (WARNING this backpack can´t be removed once it is spawned)` | `Recording_Backpack` |
| `Sig_Sauer_Bravo4_4x30_Scope` | `SIG_Sauer_BRAVO4_4x30_Scope` |
| `Surefire_Mini_Scout_Flashlight` | `SureFire_Mini_Scout_Flashight` |
| `TROY_Modular_Combat_Grip` | `Troy_Modular_Combat_Grip` |
| `Vortex_Razor_AMG_UH-1_GEN_II_Sight` | `Vortex_RAZOR_AMG_UH-1_Gen_II_Sight` |

In particular, `SureFire_Mini_Scout_Flashight` is intentionally copied with the game's spelling. Searching for the previous `Surefire_Mini_Scout_Flashlight` still finds it.

`Monstera Weapon Parts` is a subsection heading, not a copyable item. The duplicate foregrip row created by correcting `Daniel_Defense_M-LOK_Vertical_Foregrip1` is merged with its existing entry. The Recording Backpack warning remains visible beside the item and in the plain-text reference, but is never included in the copied command. That warning's behavior has not been retested.

Seven original IDs are absent from this export and remain marked **Not in export**. Their absence does not establish removal or identify a safe replacement:

- `AK_SAG_MK1_Handguard3`
- `Ammo_Plastic_Case_01a`
- `Battery`
- `Cream_Style_Corn`
- `Health_Injector`
- `MP5_Polymer_Handguard`
- `Smack_Hack`

The resulting terminal has **841 entries / 832 distinct IDs**, including shared entries in different groups, **21 categories**, and **38 weapon/parts groups**. New groups cover AS VAL/VSS, KAC LAMG, Kel-Tec RFB, M14/Norinco M305, MK-47 and other weapon parts; Food and Drink and Storage Cases have their own categories. Group names are for browsing rather than compatibility guarantees.

## Publish with GitHub Pages

A repository owner or maintainer needs to enable hosting once:

1. Open **Settings → Pages** in the repository you want to publish (the original repository or your fork).
2. Under **Build and deployment**, choose **Deploy from a branch**.
3. Select **main** and **/(root)**, then select **Save**.
4. Wait for the Pages deployment to finish and use the site URL shown in those settings.

For a repository named `Incursion-Red-River-Item-List`, the default address is `https://<owner>.github.io/Incursion-Red-River-Item-List/`.

`index.html` forwards the root address to `Incursion_Terminal.html`, preserving existing links. All links are relative so forks and project subpaths work. `.nojekyll` keeps this a plain static site. No Actions deployment workflow is needed.

## Maintain and verify

Edit the item rows in **Incursion_Terminal.html**, keeping each `data-item` value and quantity button accurate. Categories and weapon groups use native `<details>` / `<summary>` elements. Keep their `data-label` values aligned with their headings, and update the displayed item counts when changing a group. Shared items intentionally appear in multiple weapon groups. Preserve the exact source row spelling, keep any explanatory warnings outside `data-item`, and add previous spellings to `data-aliases` when correcting an ID. Update the source snapshot when reconciling a new export; do not relabel an old export as a newer game version.

Run the dependency-free regression checks with Node.js:

```sh
node --test tests/terminal.test.cjs
```

Also open `Incursion_Terminal.html` in a browser and check keyboard folding, search with no results, clearing search, copy buttons, and a narrow viewport. For an HTTP preview, run `python3 -m http.server 8000` in the repository and open `http://localhost:8000/`.
