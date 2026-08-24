export type MobileLaunchMode = 'agent' | 'team'

export interface MobileLaunchPickerItem {
  id: string
  label: string
  detail?: string
  group?: string
}
