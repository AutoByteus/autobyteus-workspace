import { library, config } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import {
  faCog
} from '@fortawesome/free-solid-svg-icons'

// This is important, otherwise the icons won't appear
config.autoAddCss = false

export default defineNuxtPlugin(nuxtApp => {
  // Add all icons to the library
  library.add(
    faCog
  )

  // Register the FontAwesomeIcon component globally
  nuxtApp.vueApp.component('font-awesome-icon', FontAwesomeIcon)
})
