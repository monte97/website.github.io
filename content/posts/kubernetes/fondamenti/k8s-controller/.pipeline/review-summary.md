# Review Summary - k8s-controller

**Tech review: 8/10** | **Style review: 8.5/10**

## Findings principali

### Tech (P1)
- WATCH descritto come "chunked transfer encoding" - impreciso per HTTP/2
- CRD manca `required` fields e `subresources: status`
- Code blocks Go senza import (non compilabili standalone)

### Style (P1)
- Manca spazio prima del trattino `-` usato come separatore (~15 punti)
- "sofisticato" (riga 86) è un aggettivo non supportato da dati

### Tech (P2)
- `ctrl.Options{}` vuoto non abilita leader election (accettabile per demo)
- `CreateOrUpdate` known issue #3191 (update senza cambiamenti)
- Selector immutabile nella mutate function: pattern fragile

### Style (P2)
- Sottotitolo "il Cuore di K8s" leggermente metaforico
- "naiva" insolito in italiano
- Blocco Go Reconcile (~52 righe) supera limite suggerito 30-40
