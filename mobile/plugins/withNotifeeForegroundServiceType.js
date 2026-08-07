const { withAndroidManifest } = require('@expo/config-plugins')

const SERVICE_NAME = 'app.notifee.core.ForegroundService'

// @notifee/react-native har ingen egen Expo config-plugin i denne versjonen,
// og AndroidManifest.xml mangler derfor android:foregroundServiceType på
// tjenesten. Uten den kaster Service.startForeground() på Android 14+
// (targetSdkVersion 34) en MissingForegroundServiceTypeException som
// krasjer hele appen idet sendingen startes.
module.exports = function withNotifeeForegroundServiceType(config) {
  return withAndroidManifest(config, (config) => {
    const app = config.modResults.manifest.application[0]
    if (!app.service) app.service = []

    let service = app.service.find((s) => s.$['android:name'] === SERVICE_NAME)
    if (!service) {
      service = { $: { 'android:name': SERVICE_NAME } }
      app.service.push(service)
    }

    service.$['android:foregroundServiceType'] = 'microphone'
    service.$['android:exported'] = service.$['android:exported'] ?? 'false'

    return config
  })
}
