# Logo sources

Official artwork only, fetched 2026-09-27. `node scripts/logos.mjs` turns these into the 40×40 full-colour tiles in `public/logos/tile-*.svg`.

| Org | File | Source | Treatment |
|---|---|---|---|
| Amazon | amazon-icon.svg | Wikimedia Commons, `File:Amazon_icon.svg` (the "a" + smile icon, #000 / #f90) | Duplicate paths removed |
| RBC (RBC Borealis) | rbc-shield.svg | en.wikipedia, `File:RBC_Royal_Bank.svg` (RBC shield, #005daa / #ffd200) | None. RBC Borealis is RBC's research institute and uses the shield |
| UVic (and the DEIA Lab) | uvic-shield-horz-white.svg | uvic.ca `/assets/core-4-0/img/shield-horz-white.svg` (official reversed logo) | Shield cropped from the lockup, on UVic blue #005493 |
| UVic CfAR | cfar-color-2021.png | uvic-cfar.com, "CFAR COLOR LOGO 2021_under glow.png" (1847×391, the site's own logo; no vector version is published) | Traced to vector (`cfar-traced.svg`, potrace per colour layer, #4b4c4c / #ea6700), drop shadow removed, cropped to "CFAR" + the orange rule |
| MLH | mlh-logo-color.svg | static.mlh.io/brand-assets/logo/official/mlh-logo-color.svg | Cropped to the letter blocks |
| Pear Care | none | No public logo found | Typographic tile ("pc"), neutral colours so no brand colour is invented |

The one-ink marks used by the v4b and v6 references (`public/logos/{amazon,rbc-borealis,uvic,mlh,airflow}.svg`) are unchanged.
