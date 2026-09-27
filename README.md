# RaffleIQ 0.1.0 preview

RaffleIQ is a standalone TornPDA userscript. It does not use ArmouryIQ or Google Sheets.

## First setup

1. Create a separate GitHub repository called `RaffleIQ`.
2. Put `RaffleIQ.user.js` at the root. Configure Greasy Fork source syncing to its raw GitHub URL and set automatic syncing after the first verified release.
3. Install the Greasy Fork script through TornPDA userscripts. Open Torn and tap the R button.
4. Create a raffle code, verify item names, bundles, and limits in Settings, and save a Torn API key with access to user logs.
5. Send a test item transfer with the exact code; use Sync incoming transfers and verify the contribution before real entries begin.

## How it works

Each approved incoming item receipt with an exact message code (case and outer spaces ignored) contributes to the same player's balance for that item. Every full bundle earns a ticket, and each item has an optional per-player quantity cap. No items of different types combine. A single receipt can award several entries. Source log ID plus item ID prevents repeat import. Tickets are sequential by import order; each draw records its winning ticket and player ID. The wheel animation displays the result of the cryptographically selected ticket.

The API key is local to this device and is not included in backups. Export a backup after sync and after a drawing. RaffleIQ does not monitor while TornPDA is closed. Do not delete TornPDA storage without exporting a backup.

## Preview limits

The importer targets Torn's v1 user log 4103 and the v1 item catalog. Torn can change log shapes. The first release needs a live test using your own receipt before relying on it. If the API returns 100 receipt logs in a request, drawing is blocked to avoid claiming complete coverage; pagination is planned for the next revision. This is a preview, not a published release.
