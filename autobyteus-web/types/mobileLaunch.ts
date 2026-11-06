/** One choice in a New run sheet (an agent, a folder, a runtime, a model). */
export interface MobileLaunchPickerItem {
  id: string
  label: string
  detail?: string
  group?: string
}
