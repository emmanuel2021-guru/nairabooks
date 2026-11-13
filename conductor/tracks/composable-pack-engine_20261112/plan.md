# Implementation Plan: Two-Layer Declarative Industry Profile & Hybrid Pack Composer

**Track ID:** `composable-pack-engine_20261112`
**Spec:** [spec.md](./spec.md)
**Created:** 2026-11-12
**Status:** [x] Completed

## Overview
Build `nairabooks.packs` engine using strict TDD to validate, compose, and apply Industry Profiles onto an organization's IFRS ledger.

## Phase 1: Pack Schema & Primitive Registry
### Tasks
- [x] Task 1.1: Write failing tests for `IndustryPack` schema validation and operational primitive compatibility checks.
- [x] Task 1.2: Implement declarative pack loader, conflict detector, and IFRS CoA merger.
### Verification
- [x] Invalid packs (missing IFRS mappings or conflicting account codes) fail loudly with plain-English guidance.

## Phase 2: Hybrid Multi-Unit Composition & Custom Builder API
### Tasks
- [x] Task 2.1: Write failing tests for merging multiple packs into one organization (e.g., Retail + Light Manufacturing, or Hotel + Diner).
- [x] Task 2.2: Implement `PackComposer` applying vocabulary overrides, department dimensions, tax defaults, and KPI definitions cleanly.
### Verification
- [x] Composed organization posts balanced transactions across active primitives into unified Nigerian IFRS reports.
