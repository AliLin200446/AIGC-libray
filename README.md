# FRAMEFIELD

Visual Control Library for Generative Media

Framefield turns camera, lens and composition concepts into visual, reusable controls for generative media. The homepage provides deterministic demonstrations; control pages connect visual intent with model translation and research evidence. Reference Analysis remains experimental and is available when its server-side OpenAI provider is configured. Human evaluation separates visible observations, inferences, uncertainty and reconstruction usefulness.

See [production deployment](docs/deployment.md) for the Vercel configuration, domain setup and release checks. Research terminology and records are retained below.


Visual Control Library translates creative intent into model-specific generative controls.

Portfolio thesis: I build control layers between creative intent and generative models.

Creative Intent → Visual Control → Model Translation → Generation → Evaluation → Feedback

The project includes a static TypeScript specification/experiment foundation and a visual-first library. The primary object is a visual control. Instructions belong to the separate model translation layer. There is no backend, database, authentication, generation API, or generation service.

## Run locally

```sh
npm install
npm run dev
```

Open http://127.0.0.1:5173/dev/controls (use the port printed by Vite if 5173 is occupied). The inspector only loads in development and is excluded from production bundles. Open `/library` for the public visual browser and `/library/dolly` for a control detail. Both share the canonical catalog. See [the asset handoff guide](docs/visual-assets.md) for adding images, videos, comparisons and model evidence.

```sh
npm run typecheck
npm run lint
npm test
npm run build
```

## Files and architecture

- `src/controls/types.ts`: canonical control, typed parameter variants, evaluation criteria and failure-mode identifiers.
- `src/controls/{camera,lens,composition}.ts`: twelve initial specifications, four per category.
- `src/controls/index.ts`: combined catalog. Dolly has an in/out direction parameter; Dolly In is not a thirteenth control.
- `src/controls/parameters.ts`: small shared parameter constructors and common test conditions.
- `src/translations/types.ts`: model identities, versioned translation records and provider settings.
- `src/translations/data.ts`: three explicitly unassigned model slots and 36 unconfigured translation records. Null instructions are intentional; replace individual entries with authored records when model testing starts.
- `src/evaluation/types.ts`: reusable qualitative assessment, evidence references, guidance and fresh untested evaluation factory.
- `src/experiments/types.ts`: controlled experiment protocol and repeated run records with exact input snapshots.
- `src/experiments/data.ts`: empty typed arrays ready for real experiments and runs.
- `src/dev/inspection.ts`: one utilitarian inspection page, generated from the data, including raw records.

Canonical controls do not own model instructions. Translations reference a control ID/revision and a model slot. Experiments reference a translation ID/revision and snapshot the actual model identity, settings and instructions. Runs reference an experiment and record exact baseline/treatment inputs and paired outputs. This preserves interpretation when editable definitions change.

## Record an experiment later

1. Assign an actual provider, model name and version to a model slot. Author the relevant translation instruction/settings; mark it `draft`, leaving observed behavior and reliability untested.
2. Add an `Experiment` in `src/experiments/data.ts` with a unique ID, studyId and baselineId from the study manifest, control and translation revisions, actual model identity, parameter values, references, baseline/translated instructions and settings, protocol, controlled variables and `untestedEvaluation()`.
3. Add one `ExperimentRun` per paired generation. Use a unique ID and a positive run number unique within that experiment. Copy the exact settings/instructions used, with seeds as strings or null if unavailable. Keep run conditions comparable, varying only the intended control and any protocol-required camera repositioning. Use the same seed across each baseline/treatment pair when supported; repeats should include independently sampled seeds.
4. A completed run requires baseline and treatment output references. Record observations, intent fidelity, collateral preservation, relevant canonical failure-mode IDs, unexpected failures and notes. Record generation errors as `error`, not as failed visual-control evidence. Never claim consistency from a single run.
5. Assess consistency on the experiment group after multiple comparable runs. Cite actual run IDs on every tested assessment and explain the judgment in notes. There is no fabricated numerical aggregate or required numerical threshold. `strong` collateral-change performance means unrelated aspects stayed stable.
6. Update translation observations/reliability only from that evidence. Update workflow status manually as testing progresses. Inspect the attached experiment/run JSON under the relevant control on the development page.

Data is manually authored V1 TypeScript, not an ingestion service. Typechecking checks record shapes; it does not validate arbitrary external JSON or all cross-record references. Keep IDs stable, increment revisions when meanings or instructions change, and retain historical specifications/translations once real experiments exist. The initial catalog tests verify its coverage, parameter defaults, translation references, and absence of invented evidence; update these seed-state assertions intentionally when real data is added.

## Interpretation boundaries

Parameter ranges/defaults are proposed test configurations, not provider capability or performance claims. Known failure modes are hypotheses. A fixed-viewpoint lens comparison changes field of view, not perspective; matched subject framing requires camera repositioning, which changes perspective. All lens definitions use a full-frame reference. A single uncalibrated generated image cannot demonstrate a physical lens, and cropping can imitate a narrow view. Read lens evidence as visual conformance under declared conditions.

The inspector is read-only. Edit the TypeScript records to change specifications or attach evidence; Vite reloads the page.

## Phase 2 — visual study protocol

Read [the production manual](docs/visual-study-protocol.md) before producing assets. The canonical scene is in `src/experiments/studies/baseline.ts`; `manifest.ts` joins all twelve existing controls to controlled study plans and provider-neutral generation handoffs. `naming.ts` names model/run/attempt/arm artifacts. Plans are specified only; no approved baseline or experimental assets exist. The first execution batch is the [Controlled Lens Set](docs/experiments/lens-set-01.md): 24 planned outputs awaiting human review. Dolly remains deferred.

## Reference Analysis provider

Reference Mode now supports explicit image analysis through a server-side OpenAI Responses adapter. Configure `.env.local` using `.env.example`, then run the normal Vite development server. Without a key, the provider remains unavailable and images stay local. See [provider setup, limits, privacy and validation](docs/openai-reference-provider.md). The Vercel Node endpoint reuses the existing provider and validator. `npm start` previews the production frontend and endpoint locally. See [production Reference Analysis](docs/production-reference-analysis.md) for setup and abuse-protection limits.

## Phase 5 — reference evaluation

Use the [developer evaluation guide](docs/evaluation/reference-analysis-evaluation.md) and [12-slot checklist](docs/evaluation/reference-suite-template.md). `npm run reference-eval -- init` creates an empty private suite outside the repository. The runner analyzes one explicitly selected reference; offline review preserves separate observation, inference, uncertainty and control-mapping judgments. The internal product gate remains EXPERIMENTAL. No pilot assets or paid results are supplied.

Curated database foundation: see [Reference curation](docs/reference-curation.md) for the development-only taxonomy, manual URL review workflow and approved-reference export.
