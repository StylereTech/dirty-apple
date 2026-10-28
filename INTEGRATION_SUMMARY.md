# Current integration summary

The previous integration notes described incomplete and mock behavior. Current implementation and verified limits are documented here:

- [Production audit and remaining release gates](docs/PRODUCTION_AUDIT.md)
- [Inventory ingestion and publication](docs/INVENTORY.md)
- [Deployment configuration and rollout](docs/DEPLOYMENT.md)
- [Direct checkout and Stripe contract](STRIPE_INTEGRATION.md)

The storefront uses a configured API proxy. MongoDB readiness and unique indexes are required before the API listens. Admin operations require a server-only administrator token. External retail offers are reviewed drafts with explicit sale prices, source stock and verification timestamps, and purchases follow retailer links. Direct checkout remains disabled until its operational prerequisites are met.

Supported source configuration is not proof of a connected affiliate feed or complete retailer coverage. See the audit for live observations and verification evidence.
