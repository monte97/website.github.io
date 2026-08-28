---
title: "Agents write the tests. Who checks that they work?"
seoTitle: "Mutation testing on AI-written tests"
date: 2026-07-10T09:00:00.000Z
description: "Mutation score correlates with real bugs at R² ≈ 0.70, line coverage stops at 0.25. How it becomes the referee for agent-written tests."
pillar: verificare
category: testing
tags:
  - Mutation Testing
  - Testing
  - AI
  - LLM
  - Stryker
  - CI/CD
lang: en
reviewed: false
draft: false
series: mutation-testing-ai
seriesOrder: 20
summary:
  - label: "Problem"
    value: "The bottleneck moved from writing the tests to judging them"
    note: "Nobody reads back thousands of tests generated in an afternoon"
  - label: "Choice"
    value: "The survived report becomes the return prompt for the agent that wrote the tests"
    note: "The referee stays external and formal, independent of whoever wrote code and tests"
  - label: "Evidence"
    value: "Mutation score and real bugs correlate at R² ≈ 0.70, line coverage stops at 0.25"
  - label: "Result"
    value: "Meta's ACH in production: 73% accepted by engineers, 36% privacy-relevant"
    note: "Trial between October and December 2024 on Facebook, Instagram, WhatsApp and wearables"
openItems:
  - "Deciding whether a mutant is equivalent remains undecidable: the detectors get better in practice, but the theoretical limit does not go away"
  - "Do-it-yourself workflows on top of Stryker or PIT have no native LLM integration: they are hand-made, not mature products"
  - "The ACH and Just-in-Time testing numbers come from Meta's infrastructure: to start, closing the loop on a small scale is enough"
openNote: "What stays outside the automatic loop, by theory and by scale."
mode: explanation
caseStudy:
  slug: "quante-versioni-stai-mantenendo"
  hook: >
    "Who checks that the tests work" is not a question about AI: there the wrong checks
    were the ones I had written myself, and the result was identical.
figures:
  - kind: flow
    at: the-arrow-that-was-missing
    label: "The open cycle, and the arrow that closes it"
    caption: "The first three steps already exist in any repo with mutation testing. The fourth is the one almost nobody does, and without it the report stays a browser tab"
    nodes:
      - kind: "1"
        name: "The spec"
        desc: "A human describes what the system has to do. It is the only point where domain knowledge enters."
        edge: "the agent reads the spec"
      - kind: "2"
        name: "The agent writes the tests"
        desc: "Thousands of lines in an afternoon. Nobody really reads them back: the bottleneck moved from writing to judging."
        edge: "the suite runs against the mutants"
      - kind: "3"
        name: "The survived report"
        desc: "Stryker, PIT or mutmut say exactly where the tests notice nothing. An objective, repeatable verdict."
        edge: "this is where the cycle usually stops"
      - kind: "4"
        name: "The report goes back to the agent"
        desc: "The same agent reads the survived mutants and uses them as a return prompt: cover this case, the one the report has just pointed you at. This is the workflow Meta put into production with ACH."
        key: true
---

In the previous post I told the story: 93% coverage, all tests green, a bug in production for three weeks because no test could tell `Sum` from `Max`. A good part of those tests had been written by AI agents, and that is where the question I want to tackle here opens up: whoever writes the tests, human or agent, what matters is whether anybody puts them to the test.

There is a part of the talk I added for the extended edition given at [DevRomagna 2026](/en/talks/il-tuo-collega-piu-produttivo/), and it is the part that looks ahead. The question is this: can the same agents that multiplied the code — and with it the tests that appear to cover without verifying — close the loop themselves? It is not a rhetorical question: production numbers already exist, and they are more recent than I thought when I was preparing the slides.

## More code, fewer certainties

LLMs multiplied how much code we write, and with it how many tests "appear" to cover it. The problem is the same one described in the previous post, just one order of magnitude larger: more green tests bring only more surface to read back, not more guarantees. And nobody really reads back thousands of tests generated in an afternoon.

The bottleneck moved. It used to be writing the tests. Now it is **judging them**.

## The arrow that was missing

The classic cycle is open: you write a spec, an agent generates tests from that spec, a mutation testing tool (Stryker, PIT, mutmut) produces a report of the *survived* mutants — the places where the tests notice nothing. Then the report ends up in a browser tab, and in practice nobody reads it line by line.

Closing the loop is simple to describe: the same agent that wrote the tests also reads the survived report, and uses it as a return prompt to improve itself. The prompt becomes precise: "cover exactly this case, the one the report has just pointed you at". That is exactly the workflow Meta put into production with the **ACH (Automated Compliance Hardening)** system.

## Mutants that know what they are afraid of

A "classic" Stryker mutates indiscriminately: `+` becomes `-`, `>` becomes `>=`, `Sum` becomes `Max`. These are generic mutations, blind to the domain.

ACH takes a different step: an engineer describes an area of risk in natural language (privacy, security, compliance) and an LLM generates mutants *specific to that area*: `log(user.email)`, `skip(consent.check)`, `role.bypass()`. Then a second model filters the equivalent mutants (different syntax, identical behaviour, pointless to test), and a third generates the test that kills the ones left. The human engineer only reviews, without writing a line.

Between October and December 2024 Meta ran a trial on Facebook, Instagram, WhatsApp and the wearable devices (Quest, Ray-Ban): across thousands of mutants and hundreds of generated tests, the privacy engineers accepted **73%** of them, and **36%** of the accepted ones were judged genuinely privacy-relevant — not easy coverage, but precisely where it counted ([Meta Engineering Blog](https://engineering.fb.com/2025/09/30/security/llms-are-the-key-to-mutation-testing-and-better-compliance/), [InfoQ](https://www.infoq.com/news/2026/01/meta-llm-mutation-testing/)).

## The problem unsolved for thirty years

There is a theoretical limit to mutation testing I did not touch in the previous post: some mutants are *equivalent*. They change the syntax but not the observable behaviour: no test will ever be able to kill them, not because the suite is weak, but because there is nothing to distinguish. Deciding whether a mutant is equivalent is, in general, undecidable: it reduces to the halting problem.

For thirty years this was handled with coarse heuristics (comparing compiled bytecode, static analysis), with high false positives. An ISSTA 2024 paper shows that a model fine-tuned on code embeddings improves equivalent detection by **35.7%** in mean F1-score over previous techniques ([arXiv 2408.01760](https://arxiv.org/abs/2408.01760)). The ACH detector, with static-analysis-based preprocessing, reaches **0.95 precision and 0.96 recall**, against 0.79/0.47 without preprocessing. The theoretical problem stays undecidable. What changes is that, in practice, it stops being an obstacle.

## Why the mutation score is worth trusting

Does a higher mutation score really find more real bugs, or is it just another green number on a dashboard? Just et al. answered in 2014, comparing mutation score against the ability to detect real historical bugs across five open source projects: correlation **R² ≈ 0.70**. Line coverage, on the same data, stays around **0.25**.

That is why it makes sense for this signal, rather than "the code was executed", to be the one guiding an agent that reviews itself.

## The next step: tests written while you review the code

Looking for more recent updates I found something that was not out yet when I wrote the slides: in April 2026 Meta extended ACH with a system called **Just-in-Time testing**, inside an internal architecture nicknamed "Dodgy Diff". Instead of maintaining a static suite, it generates targeted tests during the code review itself: tests that fail on the proposed change but pass on the previous revision, combining LLMs, program analysis, mutation testing and a risk model of the change ([InfoQ](https://www.infoq.com/news/2026/04/meta-jit-testing-ai-detection/)).

The numbers: **4x** the bug detection compared to tests generated by a baseline, **20x** fewer coincidental reports (failures that do not indicate a real defect), over **22,000 tests** evaluated, **41 issues** surfaced and **8 confirmed** as real defects with potential production impact.

Mark Harman, research scientist at Meta, put it better than I would: mutation testing *"is finally breaking out into industry"*. After decades as an academic-paper technique, it is becoming infrastructure.

## The thesis

The judgement moves, it does not disappear. The question "is this test any good?" used to be settled by a human, often by feel, looking at how green the dashboard was. Now a second system can ask it with an objective, repeatable criterion (*is this mutant killed or survived?*), and an agent can read the answer without waiting for a human's turn to scroll through a report.

But the loop closes because there is an external referee, formal, independent of whoever wrote code and tests — not because the agent trusts itself. The same principle I apply every time I delegate to an agent still holds: you delegate execution, never the final judgement on what is *correct* for the domain. All that changes is who reads the verdict first.

## What to do tomorrow

You do not need Meta's infrastructure to start closing the loop on a small scale. Run your mutation testing tool, take the survived output (Stryker and PIT export it as JSON too) and pass it to an LLM with a structured prompt: "is this mutant equivalent, or is a test missing? If it is missing, write it." It is not a mature product yet — these are hand-made workflows, stitched on top of tools with no native LLM integration — but open source projects are starting to appear that try to glue this layer onto Stryker or PIT.

It is enough to stop treating the report as the last step of a pipeline, and start treating it as the input to the next one. You do not need the perfect loop on day one.

---

*I went deeper into this part for the edition of the talk given at [DevRomagna 2026](/en/talks/il-tuo-collega-piu-produttivo/). It continues the [previous post](/en/blog/verificare/testing/mutation-testing-oltre-la-coverage/): slides and demo code are public on GitHub.*
