# Changelog

## 0.7.0

- Make each raffle announcement state its exact transfer message prominently, save a configurable host name and Torn ID, and explain how incomplete item bundles are treated.
- Add a leadership receipt for active or archived raffles with approved coded item totals, current saved MV, recorded winners, assigned and planned prizes, and the difference between received and assigned prize MV. Copy or download the report and refresh MV before sharing.

## 0.6.2

- Explain the first-transfer rule lock beside suggestions, show inline feedback when a suggestion is applied or rules are saved.
- Add a local raffle data reset that requires typing RESET and confirming deletion; keeps the saved Torn API key.

## 0.6.1

- Recalculate the first prize ticket estimate immediately when the target MV field changes.
- Show item rules as compact labeled cards on phone screens so all rule fields remain visible.

## 0.6.0

- Added target market value per ticket and per-item suggested bundle quantities, with displayed effective MV per ticket.
- Each item bundle can award more than one ticket, while the per-player cap still limits the number of credited items. Rules remain editable only before the first transfer.

## 0.5.0

- Added first, second, and third place prize item lists. Dashboard shows all prizes; combined MV is used for the warning.
- Replaced the prize picker with short matching suggestions, and made the generated announcement include saved prize items. Prize and draft edits can be saved on existing raffles without changing a completed final sync.

## 0.4.1

- Added Refresh market values on the Dashboard. Fetches fresh Torn catalog prices for recorded transfers and prize items without changing tickets or drawings.

## 0.4.0

- Show Torn catalog market value for each incoming transfer and a received total.
- Add prize items and quantities to Announcement; warn on the Dashboard once received item MV reaches prize item MV. Older receipts get a current-value estimate on the next sync.

## 0.3.1

- Keep the winner's name upright after the wheel stops and show when final sync is complete on the Dashboard.

## 0.3.0

- Added an editable raffle announcement with prize, item bundles, quantities, tickets, raffle code, and start/end times in TCT. Copying the message does not post to Torn.
- Scheduled start/end times now control transfer eligibility and permit a final sync at the scheduled end.

## 0.2.4

- Fixed incoming item receipts returned as a list of item objects. Recheck the full raffle period after a receipt parsing error, so the same transfer can be imported on the next sync.

## 0.2.3

- Added item-name suggestions after typing three letters in Settings.

## 0.2.2

- Added a button that opens Torn's prefilled RaffleIQ custom API key form. Key creation remains in Torn.

## 0.2.1

- Fixed the empty panel appearing over Torn before the R button is opened.

## 0.2.0

- Added multi-page incoming log scanning, automatic sync while Torn is visible, player name lookup and editable display names.
- Added entry cutoff and required final sync before drawing.
- Made the wheel's ticket slices and landing position match the selected ticket.
- Locked raffle pricing after the first contribution and added a receipt review warning.
- Kept backup and local data separate from the API key.

## 0.1.0

- Initial standalone preview.
