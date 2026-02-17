---
title: "OpenLayers e Vue 3: integrazione con composables e TypeScript"
date: 2026-02-14T10:00:00+01:00
description: "Pattern concreti per integrare OpenLayers in Vue 3 con shallowRef, composables tipizzati e lifecycle management"
menu:
  sidebar:
    name: OpenLayers + Vue 3
    identifier: openlayers-vue3-composables
    weight: 20
    parent: WEBDEV
tags: ["Vue", "OpenLayers", "TypeScript", "Nuxt", "Composables"]
categories: ["Frontend", "Web Development"]
draft: true
reviewed: true
---

## Reattività e oggetti imperativi: il conflitto

In un progetto Vue 3 con dati geolocalizzati, la scelta ricade spesso su OpenLayers: matura, completa, ben documentata. Il problema è che OL è una libreria imperativa: si crea un oggetto `Map`, gli si passa un target DOM, si aggiungono layer, fonti dati, stili. Ogni operazione è un metodo che muta lo stato interno. Vue 3 funziona al contrario: il template è dichiarativo, lo stato è reattivo, e il framework si occupa di aggiornare il DOM quando i dati cambiano.

Questa differenza filosofica crea un conflitto concreto. Se si inserisce un'istanza di `Map` in un `ref()`, Vue cerca di renderla deep-reactive: wrappa ogni proprietà interna in un Proxy, incluse le centinaia di proprietà interne di OpenLayers. Il risultato è unrallentamento misurabile, e in alcuni casi un crash silenzioso perché OL non si aspetta che i suoi oggetti vengano intercettati da un Proxy.

I tutorial online propongono due soluzioni, entrambe problematiche. La prima: mettere tutto in `data()` e accedere alla mappa con `this.map`. Deep reactivity, stessi problemi. La seconda: creare un plugin Nuxt che inietta OL come `$ol`, e usarlo ovunque con `this.$ol.Map(...)`. Funziona, ma nasconde le dipendenze: ogni componente dipende da un oggetto globale iniettato, non c'è tree-shaking, e i tipi TypeScript richiedono dichiarazioni manuali.

La soluzione è unpattern diverso. Lasciare gli oggetti OL **fuori** dal sistema reattivo di Vue, usando `shallowRef` invece di `ref`, e incapsulare tutta la logica mappa in composables che gestiscono il lifecycle. Vue controlla i dati (coordinate, filtri, stili). OL controlla la mappa. I composables fanno da ponte.

Questo articolo descrive i quattro pattern usati in produzione per questa integrazione. Il [repository demo](https://github.com/monte97/olm-vue-demo) con un'applicazione Nuxt 3 minimale che li implementa tutti.

## Una dipendenza, nessun plugin

Prima di entrare nei pattern, il setup. In un progetto Nuxt 3 esistente:

```bash
npm install ol
```

Nessun plugin, nessun wrapper. OpenLayers si importa direttamente dove serve. Questo è intenzionale: ogni componente dichiara esplicitamente le sue dipendenze OL, il tree-shaking funziona, e TypeScript inferisce i tipi senza configurazione.

I tipi condivisi si definiscono in un file dedicato:

```typescript
// types/map.ts
export interface GeoLocatable {
  latitude: number
  longitude: number
}

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

`GeoLocatable` è l'interfaccia base per qualsiasi entità con coordinate. Si usa come vincolo nei composables: se un oggetto ha `latitude` e `longitude`, può essere mostrato sulla mappa.

## Pattern 1: useOlMap - la mappa come composable

Il primo composable gestisce il lifecycle della mappa:

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
    map.value?.setTarget(undefined)
    map.value?.dispose()
  })

  return { map, setCenter }
}
```

Tre punti chiave.

**`shallowRef` è obbligatorio.** A differenza di `ref`, `shallowRef` rende reattivo solo il riferimento all'oggetto, non le sue proprietà interne. Quando assegni `map.value = new Map(...)`, Vue notifica i watcher. Ma Vue non crea Proxy sulle proprietà interne di Map. Questo è critico: un `Map` di OpenLayers ha centinaia di proprietà e metodi interni che non devono essere intercettati.

**La mappa si crea in `onMounted`.** OpenLayers ha bisogno di un elemento DOM reale per il rendering. In `setup()` il template non è ancora montato, quindi `target.value` sarebbe `undefined`. `onMounted` garantisce che il `ref` del template sia disponibile.

**`dispose()` previene memory leak.** Quando il componente viene distrutto, la mappa deve essere smontata. `setTarget(undefined)` sgancia la mappa dal DOM, `dispose()` libera le risorse interne (canvas, event listener, tile cache). Senza questa pulizia, ogni navigazione tra pagine accumula mappe fantasma in memoria.

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

Due righe di logica. La mappa appare, si pulisce da sola, e `setCenter` è pronto per essere collegato a qualsiasi interazione UI.

## Pattern 2: useVectorLayer - layer reattivi

La mappa da sola mostra solo le tile. Per visualizzare dati applicativi (negozi, veicoli, cantieri) servono layer vettoriali. E qui emerge il cuore del problema: i dati sono reattivi (vengono da uno store Pinia, da un polling API, da un filtro utente), ma i layer OL sono imperativi.

Il composable `useVectorLayer` fa da ponte:

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
  const source = shallowRef(new VectorSource())
  const layer = shallowRef(
    new VectorLayer({ source: source.value, style: options.style })
  )

  // Aggiungi il layer alla mappa quando diventa disponibile
  watch(options.map, (newMap, oldMap) => {
    oldMap?.removeLayer(layer.value)
    newMap?.addLayer(layer.value)
  }, { immediate: true })

  // Aggiorna le feature quando i dati cambiano
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

Il design ha quattro aspetti importanti.

**`toFeature` è ilbridge.** Èuna funzione che il chiamante fornisce per trasformare un oggetto del dominio (un `Shop`, un `Vehicle`) in un `Feature` di OpenLayers. Questo tiene la logica di conversione coordinate fuori dal composable, che resta generico.

**`watch` su items rende il layer reattivo.** Quando i dati cambiano (nuovo polling, filtro utente, aggiornamento dello store) il watcher scatta, pulisce le vecchie feature e ne crea di nuove. Il pattern `clear()` + `addFeatures()` è semplice e sufficiente: OL gestisce internamente il re-render in modo efficiente.

**Ogni feature porta metadata.** `layerType` identifica a quale layer appartiene la feature (utile per i click), `data` contiene l'oggetto originale. Il terzo argomento `true` in `feature.set()` sopprime gli eventi interni di OL, evitando re-render inutili.

**Due `watch`, un solo composable.** Il primo watch gestisce il caso in cui la mappa non è ancora pronta (il composable potrebbe essere chiamato prima di `onMounted` di `useOlMap`). Il secondo watch gestisce i dati. Entrambi hanno `immediate: true` per gestire lo stato iniziale.

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

## Pattern 3: Interazione mappa verso Vue

I primi due pattern portano i dati Vue dentro OpenLayers. Questo pattern fa il contrario: propaga le interazioni utente dalla mappa verso il sistema Vue.

```typescript
// Nel componente mappa
watch(map, (m) => {
  if (!m) return

  m.on('click', (event) => {
    const feature = m.getFeaturesAtPixel(event.pixel)[0]
    if (feature) {
      emit('click', {
        type: feature.get('layerType'),
        data: feature.get('data')
      })
    }
  })

  m.on('pointermove', (event) => {
    m.forEachFeatureAtPixel(event.pixel, (feature) => {
      emit('select', feature.get('data'))
      return true
    })
  })
}, { once: true })
```

Il punto interessante è `watch(map, ..., { once: true })`. Si evita `onMounted` perché creerebbe una dipendenza fragile dall'ordine di esecuzione: il watcher di `useOlMap` deve aver già creato la mappa prima di poter registrare handler su di essa. Con `watch`, non importa quando la mappa viene creata: il codice scatta al momento giusto, una sola volta.

I metadata `layerType` e `data` che abbiamo settato nelle feature in `useVectorLayer` tornano utili qui. Quando l'utente clicca sulla mappa, so immediatamente se ha cliccato un negozio, un veicolo o il vuoto. Il componente padre reagisce con un `switch`:

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

## Pattern 4: Polling e dati live

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
  let intervalId: ReturnType<typeof setInterval> | null = null

  function start() {
    stop()
    fn()
    intervalId = setInterval(fn, intervalMs)
  }

  function stop() {
    if (intervalId !== null) {
      clearInterval(intervalId)
      intervalId = null
    }
  }

  onUnmounted(stop)

  if (immediate) {
    start()
  }

  return { start, stop }
}
```

Il composable è volutamente minimale. `start()` chiama la funzione subito (nessun ritardo iniziale), poi la ripete all'intervallo specificato. `stop()` ferma il polling. Se `immediate` è true (default), il polling parte automaticamente al mount e si ferma all'unmount.

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

Mettendo insieme i quattro pattern, il componente pagina risulta pulito:

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

E il componente mappa:

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

La pagina non sa nulla di OpenLayers. Il componente mappa non sa nulla di API. I composables fanno da colla tra i due mondi.

## Cosa resta dopo la produzione

Le conclusioni dopo l'uso in produzione:

- **`shallowRef` è ilpattern chiave.** Senza di esso, Vue wrappa gli oggetti OL in Proxy, causando conflitti con lo stato interno di OL. Usa `shallowRef` per qualsiasi oggetto di librerie imperative complesse (OL, Three.js, D3).

- **Niente plugin, niente wrapper globale.** Importa le classi OL direttamente dove servono. Il tree-shaking funziona, i tipi sono automatici, e le dipendenze sono esplicite. Un plugin che inietta tutto l'albero OL in un oggetto `$ol` annulla tutti questi vantaggi.

- **I composables sono il bridge naturale.** Vue è dichiarativa, OL è imperativa. I composables incapsulano la parte imperativa e espongono un'interfaccia reattiva. È lostesso pattern che Vue usa internamente per il DOM.

- **Cleanup non è opzionale.** `Map.dispose()`, `clearInterval()`, rimozione dei layer: ogni risorsa creata deve essere distrutta. I composables rendono questo automatico: l'`onUnmounted` è incapsulato, il consumatore non deve ricordarsene.

- **TypeScript come contratto.** Le interfacce `GeoLocatable`, `Shop`, `Vehicle` fanno da contratto tra i layer dell'applicazione. Se i dati API cambiano formato, il compilatore lo segnala ovunque, non un bug silenzioso in produzione.

## Risorse Utili

* **Documentazione OpenLayers**: [openlayers.org](https://openlayers.org/)
* **Documentazione Vue 3**: [vuejs.org](https://vuejs.org/)
* **Documentazione Nuxt 3**: [nuxt.com](https://nuxt.com/)
* **Repository demo**: [github.com/monte97/olm-vue-demo](https://github.com/monte97/olm-vue-demo)
