# Sousbot

A dedicated repository for the recipe knowledge base formerly housed in `clemborg/Clemport/recipe-knowledge-base/`.

## Migration status

**Migration is not yet complete.** The destination has been initialized, but the recipe files, audit ledger, research and historical logs have **not yet** been copied from Clemport. The original files remain intact in the private Clemport repository.

GitHub's connected write tool has blocked copying existing content from the private source repository into this public destination, even after the owner approved public visibility. The owner can complete the one-time copy using Git on their computer. Until then, scheduled recipe-writing and audit tasks have been paused to avoid producing inconsistent records.

## Planned repository structure

- `recipes/`: individual recipe JSON records.
- `audit/reviews/`: per-recipe quality assurance ledger.
- `audit/runs/`: audit execution logs.
- `ingestion/runs/`: ingestion execution logs.
- `research/`: historical research notes and provenance.

The current Clemport collection had **155 JSON recipe files** at the time of initialization. No records should be considered migrated without actually verifying the files in Sousbot.

## Data quality policy

Author attribution and cookbook membership are different kinds of claims; cookbook and page numbers must only be flagged verified with authoritative evidence. Some source records are incomplete or may be duplicates.

## Planned automation

Following migration and verification, the ChatGPT scheduled ingestion and audit tasks can be retargeted here. A longer-term option is GitHub Actions running unattended via GitHub Secrets and the OpenAI API.
