---
layout: distill
title: "Before Taking a Note, Ask 'So What?!'"
bibliography: before-taking-a-note-ask-so-what.bib
description: "A skeptical person's perspective on note-taking, second brain, and why most notes are not worth writing."
tags: notes learning productivity
giscus_comments: false
date: 2026-07-12
featured: false
authors:
  - name: Mehdi Eidi
toc:
  - name: Attention is not free
  - name: I do not need a worse Wikipedia
  - name: The two jobs a note can do
  - name: Notes that save work
  - name: Notes that do their work immediately
  - name: My test for a note
  - name: This is not an anti-note argument
---

For a while, I thought my problem with note-taking was that I had not found the right organization system.

Maybe I needed better folders. Maybe tags were the answer. Maybe I should use Obsidian, link every concept, and slowly build a personal knowledge graph. The advice was everywhere: capture what you learn, turn it into atomic notes, connect the notes, and eventually a “second brain” will emerge!

But whenever I tried to follow that advice, a stubborn question kept getting in the way:

> So what?!

Suppose I write a careful note explaining recursion. So what?! There are already thousands of explanations of recursion, including textbooks, lectures, documentation, and articles written by people who probably understand the subject better than I do.

Suppose I create a note called “Docker,” summarize containers and images, add a few links, and connect it to Linux. Again: so what?! What can I now do that I could not do before?

That question eventually made me realize that I had been debating the wrong thing. The important question was never _how_ to organize notes. It was whether a particular note deserved _to exist_ in the first place.

## Attention is not free

Most note-taking advice begins after the decision to take a note has already been made. It tells us how to capture, structure, tag, link, review, or retrieve information. It rarely asks whether capturing that information is worth the time.

That omission matters, because information is no longer scarce. I do not need to maintain my own explanation of Git branches, HTTP status codes, Docker volumes, or recursion, merely to ensure that such explanations continue to exist. They are already available, usually in a better form than the version I would write.

Attention is not free! A note costs more than the minute it takes to type. It becomes one more thing in a collection that I may later search, reorganize, review, update, or ignore. A vault full of notes may occupy almost no disk space while still creating a great deal of mental clutter.

> The ability to capture everything does not make everything worth capturing.

## I do not need a worse Wikipedia

A personal Wikipedia sounds attractive until I ask what problem it solves.

Wikipedia is useful because it is public, broad, maintained by many people, and designed as a reference work. My private notes have none of those advantages. If I copy ordinary reference information into them, I am not producing new knowledge. I am maintaining a smaller, less accurate, less complete encyclopedia for an audience of one!

Research on the “generation effect” has repeatedly found that people tend to remember material better when they generate it rather than merely read it<d-cite key="slamecka1978generation"></d-cite>. Similarly, retrieval practice, trying to reconstruct an idea from memory, can produce stronger learning than additional passive study<d-cite key="karpicke2011retrieval"></d-cite>.

That is a good reason to explain recursion in my own words while I am learning it. It is not necessarily a good reason to preserve that explanation forever, link it to twenty other notes, and maintain it as part of a personal encyclopedia.

> The writing may be useful even when the resulting note is not.

## The two jobs a note can do

I now think a note has only two serious ways to justify itself:

1. **save future work**.
2. **improve present thinking**.

A note does not need to do both. But if it does neither, I struggle to see why I should write it.

This distinction cleared up much of my confusion because it separates two activities that are often treated as one.

Sometimes I write because I need an external memory: a record of a decision, an experiment, a failure, or a detail that will be expensive to reconstruct. Specially during research; taking useful notes while reading papers will be helpful in synthesizing ideas.

At other times I write because a thought that feels clear in my head becomes vague or contradictory as soon as I try to put it into sentences! In that case the writing is not mainly an archive. It is a tool for thinking.

## Notes that save work

The most obviously useful notes in my life are not notes about general concepts. They are records of context.

A team chooses PostgreSQL instead of MongoDB. Six months later, somebody asks why. The final choice is visible in the codebase, but the reasoning has disappeared. A short decision record can prevent the team from reopening the same argument without remembering the constraints that originally shaped it. That's why [Architecture Decision Records (ADR)](https://martinfowler.com/bliki/ArchitectureDecisionRecord.html) exist.

A production bug takes two days to diagnose. The cause turns out to be an interaction between a reverse proxy, a redirect, and a missing authorization header. The internet may contain all three pieces of information, but it does not contain the story of *this* system, *this* configuration, and *this* failure.

An experiment fails. The failure looks unimportant at the time, but three months later another approach depends on the same false assumption. A note can prevent an expensive effort.

These notes are valuable because the knowledge is local, contextual, and costly to recreate. They preserve not just the answer but the path that led to it.

This is a form of cognitive offloading: placing information in the environment so that the mind does not have to carry or reconstruct all of it<d-cite key="risko2016cognitive"></d-cite>. Offloading is useful when the external record is reliable and when retrieval is easier than redoing the work.

## Notes that do their work immediately

The other valuable kind of note is a note that may never be read again.

Sometimes I believe I understand something until I try to explain it. The act of writing exposes missing steps, vague terms, and contradictions that were easy to overlook while the thought remained private.

“I understand recursion” is a comfortable feeling.

“Explain exactly why this recursive function terminates” is a test.

Writing forces the test.

In this case, the note does its job during creation. Keeping it is optional. I may preserve it because it could be useful later, but future retrieval is not what justified the writing. You can of course just throw it away!

This is where much discussion about note-taking becomes confused. We often evaluate a note only by asking whether we will reread it. But some writing is closer to scratch work in mathematics. I do not keep every page of scratch work, yet it was necessary to reach the result.

> A note can be disposable and still worth writing.

## My test for a note

Before I write or keep a note, I now ask a few ordinary questions:

1. **Is this easy to find again?**  
   If the official documentation answers it clearly, I usually leave it there.

2. **Is this specific to my work, experience, or decision?**  
   Local context is much harder to recover than general information.

3. **Would losing this force me to repeat expensive thinking?**  
   If yes, the note is probably worth keeping.

4. **Is writing this helping me understand something right now?**  
   If yes, I write it without worrying whether it belongs in a permanent system and i would probably throw it away!

5. **Do I have a realistic reason to retrieve it?**  
   Not “perhaps one day,” but an actual project, responsibility, or recurring problem.

This is not an algorithm. It is a resistance to automatic capture. I do not want note-taking to become a parallel hobby that consumes the time and energy of the work it is supposed to support.

## This is not an anti-note argument

I am not arguing that people should stop taking notes. Researchers, writers, historians, lawyers, designers, engineers, and many others do work that depends on synthesizing and combining material across long periods of time. For them, a well-maintained collection of notes can be essential infrastructure.

I am arguing against treating that need as universal. Not everyone needs a second brain. Not every interest needs a knowledge base. Not every idea needs an atomic note, and not every relationship needs a wikilink!
