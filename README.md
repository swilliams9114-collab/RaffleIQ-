# RaffleIQ

A standalone TornPDA userscript for occasional faction raffles. No spreadsheet, Apps Script, server, or ArmouryIQ dependency.

## Setup

Install `RaffleIQ.user.js` in TornPDA, then open Torn and tap the R button. Create a raffle with a message code such as `R1`. In Settings, press **Create RaffleIQ API key in Torn** to open Torn's prefilled key form, then copy the key back into RaffleIQ. The form requests user log, user basic, and Torn items. Set a target MV per ticket and review each suggested item bundle. You can override quantity, tickets per bundle, and item caps, such as 1 Xanax for 1 ticket with cap 10, or 1 Firewalk Virus for 10 tickets with cap 1. Save rules before the first transfer. Type three letters in an item-name field to see matching Torn items. Effective MV per ticket shows the value of each rule; exceptions below your target remain visible.

The six example bundles are Flash Grenade 200, HEG 330, Smoke Grenade 61, Empty Blood Bag 308, Xanax 6 (10 credited per player), and Firewalk Virus 1 (2 credited per player). Adjust them for each raffle. The Firewalk bundle is below $5m at the market value originally supplied, so review that value and rule before using it.

## Raffle flow

1. Open **Announcement** to enter the prize and start/end dates in your device's local time. The announcement displays Torn City Time (TCT). Edit the generated text as you like, then copy it to post yourself. Regenerate draft when you want to replace edits with the latest raffle details. The start time locks after a transfer is recorded.
   In Announcement, select first, second, or third place and add each prize item and quantity. Type three letters to pick a matching Torn item. The saved prizes appear in the draft and on the Dashboard. The Dashboard compares received MV to the combined MV of all prize places and warns when it reaches that total. Contributions lists per-item and transfer market values. These are catalog estimates, not realized sale proceeds. Receipts from before this feature are valued using the catalog price when next synced.
   Press **Refresh market values** on the Dashboard to fetch current catalog prices for both received and prize items. It updates the comparison without changing tickets or draw history. Prices otherwise stay at their last saved values.
2. Give entrants the exact code. Case and outside spaces are ignored; additional words do not match. Only transfers inside the saved start/end window qualify.
3. The script reads incoming item receipts from Torn's API every five minutes while the Torn page is visible. Use **Sync incoming transfers** to refresh on demand.
4. Approved quantities accumulate by sender ID and item type. Different item types never combine. One qualifying bundle earns one ticket. Partial quantities carry toward that item's next bundle; caps limit credit across separate transfers.
5. Check Contributions and Participants. The script resolves player names via the API when the key permits it, and names can be corrected locally. The Torn player ID remains the identity key.
6. At the scheduled end, press **Final sync**, or press **Close entries** early and then **Final sync**. The draw unlocks only when the final scan finishes with no unrecognized coded receipt. Choose a winner count and whether repeat players are allowed. The wheel gives each eligible ticket one equal slice and records its winning ticket and player.
7. Export a backup after the raffle and drawing, then archive it.

The Announcement tab saves the receiving host's Torn name and player ID per raffle (default `_samara_ [3979390]`) and prominently displays the current raffle's exact transfer code. It explains that partial quantities carry forward, but an incomplete bundle at closing earns no tickets and is a faction donation unless an exception is arranged with the host before sending.

Use **Leadership receipt** after final sync. Choose an active or archived raffle, refresh its market values, then copy or download a text report. It totals all approved, correctly coded incoming items by type and quantity with unit and total MV, lists the recorded transfers, and shows planned prizes alongside winners assigned in draw order. The difference uses received MV minus the MV of prize items assigned to the first distinct winners in draw order. Repeated draws of the same player do not fill another prize place. The receipt shows item summaries and totals without listing individual transfers. A draw records a winner; the script does not verify that a prize was delivered. Unapproved or differently coded transfers are outside this report, and it is marked provisional until final sync completes.

The importer deduplicates Torn log ID plus item ID, scans additional pages when the API returns its page limit, and refuses to draw if complete coverage cannot be verified. Each receipt's ticket count stays fixed even if the item market value changes. Names and backup data stay on this device. The API key is stored separately and excluded from backup files. If TornPDA is closed, the script cannot monitor until it is opened again.

To clear local test data, open Settings → **Reset all raffle data**, type `RESET`, and confirm. This deletes all raffles, receipts, prizes, and drawing history on the device while preserving the API key. Export a backup first if you may need the results later. Rules already used by a transfer stay locked until you create a new raffle.

## Torn API and script rules

RaffleIQ makes read-only requests to Torn's official API for the user's own incoming item logs, public item names, and participant display names. It does not request game pages, scrape hidden pages, automate item transfers, send messages, or make gameplay actions. Every drawing is explicitly started by the user. A log scan runs only while Torn is visible, or when the user presses Sync. API rate limits and log schema may change; the importer stops drawing when it cannot verify coverage.

| Data storage | Data sharing | Purpose | Key storage and sharing | Key access |
|---|---|---|---|---|
| Local device storage until cleared; optional downloaded backup | Nobody automatically | Count coded receipts, calculate tickets, display and record draws | Stored locally; sent only to `api.torn.com`; omitted from backups | User log, user basic, Torn items |

Torn's official [API documentation](https://www.torn.com/api.html) and [script rules](https://www.torn.com/forums.php?f=67&p=threads&t=16037108) govern use. This is a code review against those published rules, not a formal approval from Torn staff.

## Updating

GitHub is the source. Greasy Fork Source Syncing should point to `https://raw.githubusercontent.com/swilliams9114-collab/RaffleIQ-/main/RaffleIQ.user.js` with automatic syncing enabled. Each code release increments `@version`. Update the installed Greasy Fork script in TornPDA. Local raffle history is independent of script updates.
