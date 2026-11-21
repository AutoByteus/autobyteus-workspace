import { app } from 'electron'

/** All in-app web contents, including subsequently opened windows. Not system-wide idle time. */
export class UserInputActivity {
  private last = performance.now()
  constructor() {
    app.on('web-contents-created', (_event, contents) => {
      contents.on('input-event', () => { this.last = performance.now() })
    })
  }
  lastInputAt(): number { return this.last }
}
