---
title: "OpenLayers e Vue 3: integrazione con composables e TypeScript"
date: 2026-02-14T09:00:00.000Z
description: Pattern concreti per integrare OpenLayers in Vue 3 con shallowRef, composables tipizzati e lifecycle management
pillar: progettare
category: web-development
tags:
  - Vue
  - OpenLayers
  - TypeScript
  - Nuxt
  - Composables
lang: it
reviewed: human
series: web-development
seriesOrder: 20
summary:
  - label: "Problema"
    value: "Il wrapping ricorsivo di `ref()` su oggetti OpenLayers causa rallentamenti e crash silenziosi"
    note: "Una Map di OL ha centinaia di proprietà interne che non devono diventare Proxy"
  - label: "Scelta"
    value: "`shallowRef` tiene gli oggetti OL fuori dal sistema reattivo, i composables fanno da ponte"
    note: "Vue controlla i dati dell'applicazione, OL controlla la mappa"
  - label: "Strumento"
    value: "Quattro pattern: lifecycle mappa, layer vettoriali, click sulla mappa, polling con cleanup"
  - label: "Risultato"
    value: "Cleanup incapsulato: `dispose()` evita mappe fantasma, il polling si ferma all'unmount"
    note: "Il consumatore non deve ricordarsi di liberare risorse"
openItems:
  - "`watch` con `once: true` richiede Vue 3.4+: su versioni precedenti la registrazione degli handler va organizzata diversamente"
  - "Il contratto minimo è `GeoLocatable`: qualsiasi entità con latitude e longitude entra in mappa, la demo traccia negozi fissi e veicoli in movimento"
  - "Il pattern `shallowRef` vale per qualsiasi libreria imperativa con stato interno complesso: Three.js, D3, Leaflet"
openNote: "Confini dei pattern così come usati nella demo."
mode: explanation
---

## Il problema: Vue wrappa ciò che non dovrebbe

[OpenLayers](https://openlayers.org/) è una libreria imperativa per mappe interattive. Si crea un oggetto `Map`, gli si passa un target DOM, si aggiungono layer e fonti dati chiamando metodi che mutano lo stato interno. Vue 3 funziona al contrario: si dichiara lo stato in una variabile reattiva, si usa quella variabile nel template, e il framework si occupa di aggiornare il DOM ogni volta che il valore cambia. Non serve manipolare il DOM manualmente.

Il conflitto emerge quando si prova a combinare i due modelli. In Vue 3, [`ref()`](https://vuejs.org/api/reactivity-core.html#ref) rende un oggetto **deep-reactive**: converte ricorsivamente ogni proprietà in un [Proxy](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy) per intercettare letture e scritture e aggiornare il template di conseguenza. Per i dati dell'applicazione - un contatore, una lista di coordinate - è esattamente il comportamento desiderato, ma un oggetto OpenLayers non è un dato dell'applicazione: è un oggetto complesso con centinaia di proprietà interne, e il wrapping ricorsivo causa rallentamenti misurabili e in alcuni casi crash silenziosi, perché OL non si aspetta che i suoi oggetti vengano intercettati.

### Le soluzioni comuni e i loro limiti

I workaround più comuni sono due:

- **`data()` con `this.map`** - l'oggetto finisce comunque nel sistema reattivo di Vue, con gli stessi problemi di deep-reactivity.
- **Plugin Nuxt con `$ol` globale** - funziona, ma nasconde le dipendenze: ogni componente dipende da un oggetto iniettato, il tree-shaking non funziona, e i tipi TypeScript richiedono dichiarazioni manuali.

### L'approccio: separare i due mondi

La soluzione è tenere gli oggetti OL **fuori** dal sistema reattivo, usando [`shallowRef`](https://vuejs.org/api/reactivity-advanced.html#shallowref) invece di `ref`. `shallowRef` rende reattivo solo il riferimento all'oggetto, senza convertirne le proprietà interne in Proxy. Vue controlla i dati dell'applicazione (coordinate, filtri, stili) mentre OL controlla la mappa. I [composables](https://vuejs.org/guide/reusability/composables.html) fanno da ponte tra i due.

Di seguito quattro pattern usati in produzione per questa integrazione. Il codice completo è nel repository demo:

👉 [github.com/monte97/olm-vue-demo](https://github.com/monte97/olm-vue-demo)

## Il dominio: negozi e veicoli su mappa

L'applicazione demo traccia negozi (posizioni fisse) e veicoli (posizioni in movimento) su una mappa interattiva. Dopo `npm install ol`, si definiscono i tipi che rappresentano queste entità:

```typescript
// types/map.ts
export interface GeoLocatable {
  latitude: number
  longitude: number
}
```

Il punto di partenza è `GeoLocatable`, un'interfaccia custom (non di OpenLayers) che definisce il contratto minimo per mostrare un'entità sulla mappa: basta avere `latitude` e `longitude`. I [composables](https://vuejs.org/guide/reusability/composables.html) - funzioni riutilizzabili che racchiudono logica e stato da condividere tra componenti - accettano qualsiasi oggetto che implementi `GeoLocatable` e ne convertono le coordinate nel formato OL tramite `fromLonLat`.

A questo punto siamo in grado di definire, in modo semplificato, ogni elemento di dominio che deve essere mostrato sulla mappa,

```typescript
export interface Shop extends GeoLocatable {
  id: string
  name: string
  address: string
}

export interface Vehicle extends GeoLocatable {
  id: string
  plate: string
  status: 'active' | 'idle' | 'offline'
}

export type MapLayerType = 'shop' | 'vehicle'

export interface MapClickEvent {
  type: MapLayerType
  data: Record<string, any>
}
```

## Pattern 1: useOlMap - la mappa come composable

Il primo composable gestisce il ciclo di vita della mappa: crearla quando il componente appare nel DOM, e distruggerla quando il componente viene rimosso, liberando le risorse.

```typescript
// composables/useOlMap.ts
import { shallowRef, onMounted, onUnmounted, type Ref } from 'vue'
import Map from 'ol/Map'
import View from 'ol/View'
import TileLayer from 'ol/layer/Tile'
import OSM from 'ol/source/OSM'
import { fromLonLat } from 'ol/proj'
import type { GeoLocatable } from '~/types/map'

export function useOlMap(
  target: Ref<HTMLElement | undefined>,
  options: { center?: [number, number]; zoom?: number } = {}
) {
  const { center = [12.49, 41.89], zoom = 6 } = options

  const map = shallowRef<Map>()

  function setCenter(coords: GeoLocatable, zoomLevel = 18) {
    map.value?.getView().animate({
      center: fromLonLat([coords.longitude, coords.latitude]),
      zoom: zoomLevel,
      duration: 300
    })
  }

  onMounted(() => {
    if (!target.value) return
    map.value = new Map({
      target: target.value,
      layers: [new TileLayer({ source: new OSM() })],
      view: new View({ center: fromLonLat(center), zoom })
    })
  })

  onUnmounted(() => {
    map.value?.dispose()
  })

  return { map, setCenter }
}
```

Tre punti chiave.

**`shallowRef` è obbligatorio.** A differenza di `ref`, `shallowRef` rende reattivo solo il riferimento all'oggetto, non le sue proprietà interne. Quando assegni `map.value = new Map(...)`, Vue notifica i watcher. Ma Vue non crea Proxy sulle proprietà interne di Map. Questo è critico: un `Map` di OpenLayers ha centinaia di proprietà e metodi interni che non devono essere intercettati.

**La mappa si crea in `onMounted`.** OpenLayers ha bisogno di un elemento DOM reale per il rendering. In `setup()` il template non è ancora montato, quindi `target.value` sarebbe `undefined`. `onMounted` garantisce che il `ref` del template sia disponibile.

**`dispose()` previene memory leak.** Quando il componente viene distrutto, la mappa deve essere smontata. `dispose()` sgancia la mappa dal DOM (internamente chiama `setTarget()`) e libera le risorse interne: canvas, event listener, tile cache. Senza questa pulizia, ogni navigazione tra pagine accumula mappe fantasma in memoria.

L'utilizzo nel componente è minimale:

```vue
<template>
  <div ref="mapRef" style="width: 100%; height: 80vh" />
</template>

<script setup lang="ts">
const mapRef = ref<HTMLElement>()
const { map, setCenter } = useOlMap(mapRef)
</script>
```

Il `ref` del template (`mapRef`) viene passato al composable, che lo usa come target per la mappa. Il composable restituisce `map` (la ref alla mappa, utile per i composable successivi) e `setCenter` (per centrare la mappa su una coordinata). Il componente non deve occuparsi di creare, configurare o distruggere la mappa: il composable gestisce tutto internamente.

## Il ponte tra dati reattivi e layer imperativi

La mappa da sola mostra solo le tile. Per visualizzare dati applicativi - negozi, veicoli, cantieri - servono [layer vettoriali](https://openlayers.org/en/latest/apidoc/module-ol_layer_Vector-VectorLayer.html), e qui emerge il cuore del problema: i dati sono reattivi (vengono da uno store [Pinia](https://pinia.vuejs.org/), da un polling API, da un filtro utente), ma i layer OL sono imperativi, cioè vanno creati, popolati e aggiornati manualmente chiamando metodi. Il composable `useVectorLayer` fa da ponte.

Ogni chiamata a `useVectorLayer` crea un singolo layer: per mostrare negozi e veicoli sulla stessa mappa si chiama il composable due volte, ciascuna con i propri dati e stili. Il composable riceve come parametro la mappa, i dati da visualizzare, lo stile grafico e una funzione di conversione. Il generico `T` rappresenta il tipo di dato del dominio (ad esempio `Shop` o `Vehicle`). La funzione `toFeature` è il punto chiave: il chiamante la fornisce per trasformare un oggetto del dominio in un `Feature` di OpenLayers. Questo tiene la logica di conversione coordinate fuori dal composable, che resta generico.

```typescript
// composables/useVectorLayer.ts
import { shallowRef, watch, type Ref, type WatchSource } from 'vue'
import Map from 'ol/Map'
import Feature from 'ol/Feature'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import type { StyleLike } from 'ol/style/Style'
import type { MapLayerType } from '~/types/map'

export function useVectorLayer<T>(options: {
  map: Ref<Map | undefined>
  items: WatchSource<T[]>
  toFeature: (item: T) => Feature
  style: StyleLike
  layerType: MapLayerType
}) {
```

Source e layer vengono creati con `shallowRef` (come per la mappa nel composable precedente). Il primo `watch` gestisce il ciclo di vita: il composable potrebbe essere chiamato prima che la mappa sia pronta, quindi il watcher aspetta che la ref passi da `undefined` all'istanza effettiva e a quel punto aggiunge il layer. L'opzione `immediate: true` garantisce che, se la mappa è già disponibile al momento della creazione del watcher, il callback parta subito senza attendere un cambio.

```typescript
  const source = shallowRef(new VectorSource())
  const layer = shallowRef(
    new VectorLayer({ source: source.value, style: options.style })
  )

  watch(options.map, (newMap, oldMap) => {
    oldMap?.removeLayer(layer.value)
    newMap?.addLayer(layer.value)
  }, { immediate: true })
```

Il secondo `watch` osserva i dati e rende il layer reattivo. Quando i dati cambiano (nuovo polling, filtro utente, aggiornamento dello store) il watcher scatta, pulisce le vecchie feature e ne crea di nuove, grazie ad `immediate: true` i layer sono immediatamente popolati se i dati sono già presenti. Su ogni feature vengono salvati due metadata: `layerType` per identificare il layer nei click, e `data` con l'oggetto originale. Il terzo argomento `true` in `feature.set()` sopprime gli eventi interni di OL, evitando re-render inutili.

```typescript
  watch(options.items, (newItems) => {
    const src = source.value
    src.clear()
    if (!newItems?.length) return

    const features = newItems
      .map((item) => {
        try {
          const feature = options.toFeature(item)
          feature.set('layerType', options.layerType, true)
          feature.set('data', item, true)
          return feature
        } catch {
          return null
        }
      })
      .filter((f): f is Feature => f !== null)

    src.addFeatures(features)
  }, { immediate: true })

  return { layer, source }
}
```

Ecco come si usa per due layer diversi:

```typescript
// Layer negozi (icone)
useVectorLayer<Shop>({
  map,
  items: () => props.shops,
  layerType: 'shop',
  style: new Style({
    image: new Icon({ src: '/icons/shop.png', scale: 0.35 })
  }),
  toFeature: (shop) =>
    new Feature({ geometry: new Point(fromLonLat([shop.longitude, shop.latitude])) })
})

// Layer veicoli (cerchi colorati per stato)
const vehicleList = computed(() => Object.values(props.vehicles))

useVectorLayer<Vehicle>({
  map,
  items: vehicleList,
  layerType: 'vehicle',
  style: (feature) => new Style({
    image: new CircleStyle({
      radius: 7,
      fill: new Fill({ color: feature.get('color') }),
      stroke: new Stroke({ color: '#fff' })
    })
  }),
  toFeature: (v) => {
    const colors = { active: '#00ff00', idle: '#ffaa00', offline: '#ff0000' }
    const feature = new Feature({
      geometry: new Point(fromLonLat([v.longitude, v.latitude]))
    })
    feature.set('color', colors[v.status], true)
    return feature
  }
})
```

Stessa API, stili diversi. I negozi hanno un'icona statica, i veicoli un cerchio il cui colore dipende dai dati. La funzione `style` di OL riceve la feature come argomento, quindi è possibile leggere le proprietà settate in `toFeature` per decidere lo stile al volo.

## Dalla mappa al componente: propagare i click

I primi due pattern portano i dati Vue dentro OpenLayers. Questo pattern fa il contrario: propaga le interazioni utente dalla mappa verso il sistema Vue.

```typescript
// Nel componente che usa useOlMap (es. MapComponent.vue)
import { onUnmounted } from 'vue'
import { unByKey } from 'ol/Observable'
import type { EventsKey } from 'ol/events'

const listenerKeys: EventsKey[] = []

watch(map, (m) => {
  if (!m) return

  listenerKeys.push(
    m.on('click', (event) => {
      const feature = m.getFeaturesAtPixel(event.pixel)[0]
      if (feature) {
        emit('click', {
          type: feature.get('layerType'),
          data: feature.get('data')
        })
      }
    }),

    m.on('pointermove', (event) => {
      m.forEachFeatureAtPixel(event.pixel, (feature) => {
        emit('select', feature.get('data'))
        return true
      })
    })
  )
}, { once: true })

onUnmounted(() => {
  unByKey(listenerKeys)
})
```

Il punto interessante è `watch(map, ..., { once: true })`. L'opzione `once` (disponibile da **Vue 3.4+**) fa sì che il watcher si auto-rimuova dopo la prima esecuzione: gli handler vengono registrati una volta e il watcher smette di osservare.

La scelta di usare `watch` invece di `onMounted` non è casuale. `onMounted` esegue quando il componente è montato nel DOM, ma a quel punto la ref `map` potrebbe non essere ancora valorizzata (dipende dall'ordine di esecuzione dei composable). Con `watch` il problema non si pone: il callback scatta quando la mappa diventa effettivamente disponibile, indipendentemente dal timing.

I metadata `layerType` e `data` settati nelle feature in `useVectorLayer` tornano utili qui. Quando l'utente clicca sulla mappa, so immediatamente se ha cliccato un negozio, un veicolo o il vuoto. Il componente padre reagisce con un `switch`:

```typescript
function handleMapClick(event: MapClickEvent) {
  switch (event.type) {
    case 'shop':
      selectedShop.value = event.data as Shop
      showShopDetail.value = true
      break
    case 'vehicle':
      router.push(`/vehicles/${(event.data as Vehicle).id}`)
      break
  }
}
```

## Aggiornare senza leak: polling con cleanup automatico

In un'applicazione con tracking in tempo reale, i dati dei veicoli cambiano continuamente. Serve un polling periodico che aggiorni lo stato senza leak.

```typescript
// composables/usePolling.ts
import { onUnmounted } from 'vue'

export function usePolling(
  fn: () => Promise<void> | void,
  intervalMs: number,
  options: { immediate?: boolean } = {}
) {
  const { immediate = true } = options
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  let active = false

  async function tick() {
    if (!active) return
    try {
      await fn()
    } catch (e) {
      console.error('Polling error:', e)
    }
    if (active) {
      timeoutId = setTimeout(tick, intervalMs)
    }
  }

  function start() {
    stop()
    active = true
    tick()
  }

  function stop() {
    active = false
    if (timeoutId !== null) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
  }

  onUnmounted(stop)

  if (immediate) {
    start()
  }

  return { start, stop }
}
```

Il composable è volutamente minimale. `start()` chiama la funzione subito (nessun ritardo iniziale), poi la ripete all'intervallo specificato. Si usa `setTimeout` ricorsivo invece di `setInterval` per un motivo preciso: se `fn` è asincrona e impiega più dell'intervallo per completarsi, `setInterval` lancerebbe chiamate concorrenti con risposte che arrivano fuori ordine. Con `setTimeout` ricorsivo, il prossimo ciclo parte solo dopo che il precedente è terminato. `stop()` ferma il polling. Se `immediate` è true (default), il polling parte automaticamente al mount e si ferma all'unmount.

L'utilizzo nella pagina:

```typescript
const vehicles = ref<Record<string, Vehicle>>({})

async function fetchVehicles() {
  try {
    const response = await api.getCurrentPositions()
    vehicles.value = response.data
  } catch {
    // Errori di rete silenziati: il prossimo polling riprova
  }
}

usePolling(fetchVehicles, 5000)
```

Il `try/catch` è importante. Senza, un errore di rete (backend temporaneamente irraggiungibile) genera un'eccezione non gestita ogni 5 secondi. Con il `try/catch`, il polling continua silenziosamente e riprova al prossimo ciclo.

Un dettaglio sul lifecycle: `usePolling` chiama `onUnmounted(stop)` internamente, quindi non serve ricordarsi di pulire l'intervallo. Quando si naviga via dalla pagina, Vue smonta il componente, il composable reagisce e il polling si ferma. Nessun intervallo orfano.

## Il quadro completo

Mettendo insieme i quattro pattern, la separazione delle responsabilità diventa evidente. Il componente pagina gestisce solo dati e layout: non importa nulla da OpenLayers, non sa come funziona la mappa.

```vue
<template>
  <div>
    <MapComponent
      :vehicles="vehicles"
      :shops="shops"
      @click="handleMapClick"
    />
    <Sidebar :shops="shops" @focus="setCenter" />
  </div>
</template>

<script setup lang="ts">
import { usePolling } from '~/composables/usePolling'

const shops = ref<Shop[]>([])
const vehicles = ref<Record<string, Vehicle>>({})

// Dati statici: caricati una volta
onMounted(async () => {
  shops.value = await api.getShops()
})

// Dati live: polling ogni 5 secondi
usePolling(async () => {
  try {
    vehicles.value = (await api.getPositions()).data
  } catch { /* retry al prossimo ciclo */ }
}, 5000)
</script>
```

Il componente mappa, al contrario, non sa nulla di API o di come i dati vengono recuperati. Riceve props e compone i composable visti finora: `useOlMap` (lifecycle della mappa e navigazione), `useVectorLayer` (sincronizzazione dati reattivi con i layer OL), e un `watch` con `once` per gli handler di click.

```vue
<script setup lang="ts">
import { useOlMap } from '~/composables/useOlMap'
import { useVectorLayer } from '~/composables/useVectorLayer'

const props = defineProps<{
  vehicles: Record<string, Vehicle>
  shops: Shop[]
}>()

const emit = defineEmits<{
  click: [event: MapClickEvent]
}>()

const mapRef = ref<HTMLElement>()
const { map, setCenter } = useOlMap(mapRef)

useVectorLayer<Shop>({ map, items: () => props.shops, /* style e toFeature omessi */ })
useVectorLayer<Vehicle>({ map, items: computed(() => Object.values(props.vehicles)), /* style e toFeature omessi */ })

watch(map, (m) => {
  if (!m) return
  m.on('click', (event) => { /* emit */ })
}, { once: true })
</script>
```

I composables fanno da colla tra i due mondi: la pagina passa dati, la mappa li visualizza, nessuno dei due conosce i dettagli dell'altro.

## Cinque pattern da portare via

- **`shallowRef` per gli oggetti imperativi.** Lo stesso pattern si applica a qualsiasi libreria con stato interno complesso: Three.js, D3, Leaflet.

- **Import diretti, nessun plugin.** Tree-shaking, tipi automatici, dipendenze esplicite.

- **Composables come bridge.** Incapsulano la parte imperativa e espongono un'interfaccia reattiva. Il consumatore non interagisce mai direttamente con OL.

- **Cleanup automatico.** `onUnmounted` incapsulato nel composable: il consumatore non deve ricordarsi di liberare risorse.

- **TypeScript come contratto.** Se i dati API cambiano formato, il compilatore lo segnala in tutti i composables che li usano.

## Risorse Utili

* **Documentazione OpenLayers**: [openlayers.org](https://openlayers.org/)
* **Documentazione Vue 3**: [vuejs.org](https://vuejs.org/)
* **Documentazione Nuxt 3**: [nuxt.com](https://nuxt.com/)
* **Repository demo**: [github.com/monte97/olm-vue-demo](https://github.com/monte97/olm-vue-demo)
