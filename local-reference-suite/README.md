# Local reference evaluation suite

**Superseded by Phase 5:** use the [evaluation harness](../docs/evaluation/reference-analysis-evaluation.md). New private images belong in `~/Library/Application Support/Visual Control Library/reference-evaluation/images/`, outside the repository. Vite now denies this legacy directory. The notes below describe the earlier manual export workflow, not the current evaluation protocol.

Add only images you own or have permission to analyze. Keep them here, outside `public/`, `src/`, studies and experiment evidence. The directory contents are git-ignored except for this guide and are not copied to the production build.

Suggested coverage: centered, symmetry, thirds, negative space, wide-like perspective, normal-like perspective, telephoto-like perspective, and deliberately ambiguous lens evidence. Include portraits only with appropriate permission. Preserve original framing and record any intentional edits separately.

Do not run a benchmark automatically. Use explicit Analyze Reference requests in the development app. Each request sends the selected image to OpenAI and can incur API usage. Use DEV / EXPORT NORMALIZED JSON after successful real analysis; the export contains observations, inferences, metadata and dimensions, never image bytes. Add an optional `reviewerNote` in your local JSON copy if useful. Keep exports in this ignored directory. Do not turn these references into controlled experiment evidence.
