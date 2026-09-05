---
name: Production schema compatibility
description: Existing SmartEGE databases may differ from the original SQL migration types.
---

Before applying a new migration, inspect the live database column types used by referenced keys. The existing SmartEGE `users.id` key is UUID even though the original initial migration declares integer IDs, so new foreign keys must match the deployed UUID type.

**Why:** Applying the study-planning migration with integer foreign keys failed and could not create the production feature tables.

**How to apply:** Preserve the existing users/subscriptions schema and align only new reference columns with the actual users key type; apply production changes through the Replit Publish schema flow.