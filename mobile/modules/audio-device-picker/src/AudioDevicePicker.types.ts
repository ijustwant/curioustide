export type AudioDevice = {
  id: number
  name: string
  type: 'builtin' | 'wired' | 'usb' | 'bluetooth' | 'external' | 'other'
}
