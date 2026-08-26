---
title: "OpenLayers and Vue 3: Integration with Composables and TypeScript"
seoTitle: "OpenLayers + Vue 3: typed composables"
date: 2026-02-14T09:00:00.000Z
description: Practical patterns for integrating OpenLayers into Vue 3 using shallowRef, typed composables, and lifecycle management. Runnable demo included.
pillar: progettare
category: web-development
tags:
  - Vue
  - OpenLayers
  - TypeScript
  - Nuxt
  - Composables
lang: en
reviewed: machine
series: web-development
seriesOrder: 20
---

## The Problem: Vue Wraps What It Shouldn't

[OpenLayers](https://openlayers.org/) is an imperative library for interactive maps. You create a `Map` object, pass it a DOM target, add layers and data sources by calling methods that mutate internal state. Vue 3 works the other way: you declare state in a reactive variable, use that variable in a template, and the framework handles updating the DOM whenever the value changes. No manual DOM manipulation needed.

The conflict emerges when you try to combine the two models. In Vue 3, [`ref()`](https://vuejs.org/api/reactivity-core.html#ref) makes an object **deep-reactive**: it recursively converts every property into a [Proxy](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy) to intercept reads and writes and update the template accordingly. For application data — a counter, a list of coordinates — this is exactly the desired behavior, but an OpenLayers object is not application data: it is a complex object with hundreds of internal properties, and recursive wrapping causes measurable slowdowns and in some cases silent crashes, because OL does not expect its objects to be intercepted.

### Common Solutions and Their Limitations

The two most common workarounds are:

- **`data()` with `this.map`** — the object still ends up in Vue's reactive system, with the same deep-reactivity problems.
- **Nuxt plugin with a global `$ol`** — works, but hides dependencies: every component depends on an injected object, tree-shaking does not work, and TypeScript types require manual declarations.

### The Approach: Separating the Two Worlds

The solution is to keep OL objects **outside** the reactive system, using [`shallowRef`](https://vuejs.org/api/reactivity-advanced.html#shallowref) instead of `ref`. `shallowRef` makes only the reference to the object reactive, without converting its internal properties into Proxies. Vue controls application data (coordinates, filters, styles) while OL controls the map. [Composables](https://vuejs.org/guide/reusability/composables.html) act as the bridge between the two.

Below are four patterns used in production for this integration. The complete code is in the demo repository:

[github.com/monte97/olm-vue-demo](https://github.com/monte97/olm-vue-demo)

## The Domain: Shops and Vehicles on a Map

The demo application tracks shops (fixed positions) and vehicles (moving positions) on an interactive map. After `npm install ol`, define the types that represent these entities:

```typescript
// types/map.ts
export interface GeoLocatable {
  latitude: number
  longitude: number
}
```

`GeoLocatable` is a custom interface (not from OpenLayers) that defines the minimum contract for displaying an entity on the map: it just needs `latitude` and `longitude`. [Composables](https://vuejs.org/guide/reusability/composables.html) — reusable functions that encapsulate logic and state to share across components — accept any object implementing `GeoLocatable` and convert its coordinates to OL format via `fromLonLat`.

From here, each domain element that needs to appear on the map can be defined in simplified form:

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

## Pattern 1: useOlMap — The Map as a Composable

The first composable manages the map lifecycle: creating it when the component appears in the DOM, and disposing of it when the component is removed, freeing resources.

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

Three key points.

**`shallowRef` is mandatory.** Unlike `ref`, `shallowRef` makes only the object reference reactive, not its internal properties. When you assign `map.value = new Map(...)`, Vue notifies watchers. But Vue does not create Proxies on Map's internal properties. This is critical: an OpenLayers `Map` has hundreds of internal properties and methods that must not be intercepted.

**The map is created in `onMounted`.** OpenLayers needs a real DOM element for rendering. In `setup()` the template has not yet been mounted, so `target.value` would be `undefined`. `onMounted` guarantees that the template ref is available.

**`dispose()` prevents memory leaks.** When the component is destroyed, the map must be unmounted. `dispose()` detaches the map from the DOM (internally calls `setTarget()`) and releases internal resources: canvas, event listeners, tile cache. Without this cleanup, every page navigation accumulates ghost maps in memory.

Usage in the component is minimal:

```vue
<template>
  <div ref="mapRef" style="width: 100%; height: 80vh" />
</template>

<script setup lang="ts">
const mapRef = ref<HTMLElement>()
const { map, setCenter } = useOlMap(mapRef)
</script>
```

The template ref (`mapRef`) is passed to the composable, which uses it as the map target. The composable returns `map` (the ref to the map, useful for subsequent composables) and `setCenter` (for centering the map on a coordinate). The component does not need to create, configure, or destroy the map: the composable handles everything internally.

## The Bridge Between Reactive Data and Imperative Layers

The map alone only shows tiles. To display application data — shops, vehicles, worksites — [vector layers](https://openlayers.org/en/latest/apidoc/module-ol_layer_Vector-VectorLayer.html) are needed, and here is the core of the problem: data is reactive (coming from a [Pinia](https://pinia.vuejs.org/) store, an API poll, a user filter), but OL layers are imperative — they must be created, populated, and updated manually by calling methods. The `useVectorLayer` composable acts as the bridge.

Each call to `useVectorLayer` creates a single layer: to show shops and vehicles on the same map, call the composable twice, each with its own data and styles. The composable receives the map, the data to display, the graphic style, and a conversion function. The generic `T` represents the domain data type (e.g., `Shop` or `Vehicle`). The `toFeature` function is the key point: the caller provides it to transform a domain object into an OpenLayers `Feature`. This keeps coordinate conversion logic outside the composable, which remains generic.

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

Source and layer are created with `shallowRef` (same as the map in the previous composable). The first `watch` handles the lifecycle: the composable might be called before the map is ready, so the watcher waits for the ref to go from `undefined` to the actual instance and then adds the layer. The `immediate: true` option ensures that if the map is already available when the watcher is created, the callback fires immediately without waiting for a change.

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

The second `watch` observes data and makes the layer reactive. When data changes (new poll, user filter, store update), the watcher fires, clears old features, and creates new ones. With `immediate: true` the layers are populated immediately if data is already present. Two metadata values are stored on each feature: `layerType` to identify the layer on clicks, and `data` with the original object. The third argument `true` in `feature.set()` suppresses OL's internal events, avoiding unnecessary re-renders.

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

Here is how it is used for two different layers:

```typescript
// Shop layer (icons)
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

// Vehicle layer (colored circles by status)
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

Same API, different styles. Shops have a static icon, vehicles a circle whose color depends on data. OL's `style` function receives the feature as an argument, so properties set in `toFeature` can be read to decide the style dynamically.

## From Map to Component: Propagating Clicks

The first two patterns bring Vue data into OpenLayers. This pattern does the opposite: it propagates user interactions from the map back into the Vue system.

```typescript
// In the component using useOlMap (e.g. MapComponent.vue)
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

The interesting point is `watch(map, ..., { once: true })`. The `once` option (available from **Vue 3.4+**) causes the watcher to self-remove after the first execution: handlers are registered once and the watcher stops observing.

The choice to use `watch` instead of `onMounted` is intentional. `onMounted` runs when the component is mounted in the DOM, but at that point the `map` ref might not yet be populated (depending on composable execution order). With `watch` the problem disappears: the callback fires when the map actually becomes available, regardless of timing.

The `layerType` and `data` metadata set on features in `useVectorLayer` pay off here. When a user clicks on the map, you immediately know whether they clicked a shop, a vehicle, or empty space. The parent component reacts with a `switch`:

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

## Updating Without Leaks: Polling with Automatic Cleanup

In a real-time tracking application, vehicle data changes continuously. A periodic polling loop is needed that updates state without leaks.

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

The composable is intentionally minimal. `start()` calls the function immediately (no initial delay), then repeats it at the specified interval. Recursive `setTimeout` is used instead of `setInterval` for a specific reason: if `fn` is async and takes longer than the interval to complete, `setInterval` would launch concurrent calls with responses arriving out of order. With recursive `setTimeout`, the next cycle starts only after the previous one has finished. `stop()` halts polling. If `immediate` is true (default), polling starts automatically at mount and stops at unmount.

Usage on the page:

```typescript
const vehicles = ref<Record<string, Vehicle>>({})

async function fetchVehicles() {
  try {
    const response = await api.getCurrentPositions()
    vehicles.value = response.data
  } catch {
    // Network errors silenced: next poll retries
  }
}

usePolling(fetchVehicles, 5000)
```

The `try/catch` matters. Without it, a network error (backend temporarily unreachable) generates an unhandled exception every 5 seconds. With `try/catch`, polling continues silently and retries on the next cycle.

A lifecycle note: `usePolling` calls `onUnmounted(stop)` internally, so there is no need to remember to clean up the interval. When navigating away from the page, Vue unmounts the component, the composable reacts, and polling stops. No orphaned intervals.

## The Complete Picture

Putting the four patterns together, the separation of responsibilities becomes clear. The page component manages only data and layout: it imports nothing from OpenLayers and does not know how the map works.

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

// Static data: loaded once
onMounted(async () => {
  shops.value = await api.getShops()
})

// Live data: polling every 5 seconds
usePolling(async () => {
  try {
    vehicles.value = (await api.getPositions()).data
  } catch { /* retry on next cycle */ }
}, 5000)
</script>
```

The map component, by contrast, knows nothing about APIs or how data is fetched. It receives props and composes the composables seen above: `useOlMap` (map lifecycle and navigation), `useVectorLayer` (syncing reactive data with OL layers), and a `watch` with `once` for click handlers.

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

useVectorLayer<Shop>({ map, items: () => props.shops, /* style and toFeature omitted */ })
useVectorLayer<Vehicle>({ map, items: computed(() => Object.values(props.vehicles)), /* style and toFeature omitted */ })

watch(map, (m) => {
  if (!m) return
  m.on('click', (event) => { /* emit */ })
}, { once: true })
</script>
```

Composables act as glue between the two worlds: the page passes data, the map displays it, and neither knows the details of the other.

## Five Patterns to Take Away

- **`shallowRef` for imperative objects.** The same pattern applies to any library with complex internal state: Three.js, D3, Leaflet.

- **Direct imports, no plugin.** Tree-shaking, automatic types, explicit dependencies.

- **Composables as bridges.** They encapsulate the imperative part and expose a reactive interface. Consumers never interact directly with OL.

- **Automatic cleanup.** `onUnmounted` encapsulated inside the composable: consumers do not need to remember to free resources.

- **TypeScript as a contract.** If API data changes format, the compiler flags it in every composable that uses it.

## Useful Resources

* **OpenLayers Documentation**: [openlayers.org](https://openlayers.org/)
* **Vue 3 Documentation**: [vuejs.org](https://vuejs.org/)
* **Nuxt 3 Documentation**: [nuxt.com](https://nuxt.com/)
* **Demo repository**: [github.com/monte97/olm-vue-demo](https://github.com/monte97/olm-vue-demo)
