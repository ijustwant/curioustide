import { ScrollView, View, Text, StyleSheet } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../App'
import { useT, useSections } from '../i18n'

type Props = NativeStackScreenProps<RootStackParamList, 'Help'>

export default function HelpScreen({ navigation }: Props) {
  const t = useT()
  const sections = useSections()

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content}>
      {sections.map((seksjon) => (
        <View key={seksjon.tittel} style={s.card}>
          <Text style={s.cardTitle}>{seksjon.tittel}</Text>
          {seksjon.innhold.map((linje, i) => (
            <View key={i} style={s.row}>
              <Text style={s.bullet}>•</Text>
              <Text style={s.linje}>{linje}</Text>
            </View>
          ))}
        </View>
      ))}

      <View style={s.card}>
        <Text style={s.cardTitle}>{t('help.questions')}</Text>
        <Text style={s.linje}>{t('help.contactText')}</Text>
      </View>
    </ScrollView>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#020617' },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  card: {
    backgroundColor: '#0f172a',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  cardTitle: { color: '#f1f5f9', fontSize: 16, fontWeight: '700', marginBottom: 10 },
  row: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  bullet: { color: '#38bdf8', marginTop: 1 },
  linje: { color: '#94a3b8', fontSize: 14, flex: 1, lineHeight: 20 },
})
