## Improvements

- Sending a message in a long-running agent, team or organization run no longer slows down as the run's history grows. Each message is now added to the end of the run's message log instead of rewriting the whole log, and logs are split into files of about 4 MB.
- On the first start after the update, existing message histories are converted to the new format. Every message, reference file and attachment link is kept. On large installs this first start can take a little longer.

## Notes

- After this update, an older version of the app cannot read message histories written by this version.
