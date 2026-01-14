---
title: "{{ replace .Name "-" " " | title }}"
date: {{ .Date }}
draft: true
menu:
  notes:
    name: {{ replace .Name "-" " " | title }}
    identifier: {{ .Name }}
    weight: 10
---

{{</* note title="Titolo Nota" */>}}
Contenuto della nota...
{{</* /note */>}}
