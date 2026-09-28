# Changelog

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
